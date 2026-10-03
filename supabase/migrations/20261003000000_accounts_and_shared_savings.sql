-- Accounts and shared savings.
--
-- Privacy model (enforced here, in the database, not in the app):
--   * Every table has Row Level Security. Clients may only SELECT; every write goes through the functions below,
--     which check auth.uid() themselves. Pending invitees and unrelated accounts can read nothing.
--   * Only explicitly shared savings entries exist in this database. Income, budgets, expenses, personal totals and
--     unshared savings never leave the phone.
--   * Sharing is a view of one record: an entry is stored once (unique per owner and local id) and the group total
--     is computed from those rows. It never touches anybody's personal total.
--
-- Dates are plain calendar dates (the owner's own day), amounts are integer fils.

-- ---------------------------------------------------------------------------------------------------------------
-- Profiles: one per auth user, with a unique username (lower case, 3 to 20 of a-z 0-9 _).
-- ---------------------------------------------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$')
);
create unique index profiles_username_unique on public.profiles (username);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, username)
  values (new.id, lower(coalesce(new.raw_user_meta_data ->> 'username', '')));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- A username never changes, so labels in shared history stay truthful.
create function public.profiles_username_immutable() returns trigger
language plpgsql as $$
begin
  if new.username <> old.username then
    raise exception 'username cannot be changed';
  end if;
  return new;
end $$;

create trigger profiles_username_immutable before update on public.profiles
  for each row execute function public.profiles_username_immutable();

-- ---------------------------------------------------------------------------------------------------------------
-- Groups (a pair of people is a group of two) and membership.
-- ---------------------------------------------------------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'declined', 'left', 'removed')),
  role text not null default 'member' check (role in ('admin', 'member')),
  invited_by uuid references public.profiles (id),
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

-- Shared savings entries: ONE row per shared saving. local_id is the id of the saving on the owner's device
-- (device id + entry id), so editing it again updates this row instead of adding another.
create table public.shared_entries (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  local_id text not null check (char_length(local_id) between 1 and 80),
  kind text not null check (kind in ('deposit', 'withdrawal')),
  amount bigint not null check (amount > 0 and amount <= 100000000000),
  entry_date date not null,
  note text not null default '' check (char_length(note) <= 140),
  shared_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, local_id)
);
create index shared_entries_group_idx on public.shared_entries (group_id, entry_date);

-- What happened in a group. Never contains amounts, so history stays explainable after an entry is made private.
create table public.group_events (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.groups (id) on delete cascade,
  kind text not null check (kind in (
    'group_created', 'invited', 'joined', 'declined', 'left', 'removed',
    'entry_shared', 'entry_edited', 'entry_unshared'
  )),
  actor_id uuid references public.profiles (id) on delete set null,
  subject_id uuid references public.profiles (id) on delete set null,
  occurred_at timestamptz not null default now()
);
create index group_events_group_idx on public.group_events (group_id, id);

-- ---------------------------------------------------------------------------------------------------------------
-- Access helpers. SECURITY DEFINER so policies can ask about membership without recursing into themselves.
-- ---------------------------------------------------------------------------------------------------------------
create function public.is_member(p_group uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group and user_id = auth.uid() and status = 'accepted'
  );
$$;

create function public.shares_group_with(p_user uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1
    from public.group_members me
    join public.group_members other on other.group_id = me.group_id
    where me.user_id = auth.uid() and me.status = 'accepted'
      and other.user_id = p_user and other.status in ('accepted', 'pending')
  );
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Row Level Security: read only, and only what you are entitled to.
-- ---------------------------------------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.shared_entries enable row level security;
alter table public.group_events enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_group_with(id));

create policy groups_select on public.groups for select to authenticated
  using (public.is_member(id));

create policy group_members_select on public.group_members for select to authenticated
  using (user_id = auth.uid() or public.is_member(group_id));

create policy shared_entries_select on public.shared_entries for select to authenticated
  using (public.is_member(group_id));

create policy group_events_select on public.group_events for select to authenticated
  using (public.is_member(group_id));

revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.groups, public.group_members,
  public.shared_entries, public.group_events to authenticated;
-- No INSERT, UPDATE or DELETE grants: every change goes through the functions below.

-- ---------------------------------------------------------------------------------------------------------------
-- Functions (the only way to write). All check auth.uid() themselves.
-- ---------------------------------------------------------------------------------------------------------------
create function public.require_user() returns uuid
language plpgsql stable as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  return v_uid;
end $$;

-- Is this username free? Callable before registering. Reports false for anything that is not a valid username.
create function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select lower(coalesce(p_username, '')) ~ '^[a-z0-9_]{3,20}$'
     and not exists (select 1 from public.profiles where username = lower(p_username));
$$;

create function public.my_profile() returns table (id uuid, username text, email text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_user();
begin
  return query
    select p.id, p.username, u.email::text
    from public.profiles p join auth.users u on u.id = p.id
    where p.id = v_uid;
end $$;

create function public.create_group(p_name text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_user();
  v_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
begin
  if char_length(v_name) < 1 or char_length(v_name) > 60 then
    raise exception 'group name must be 1 to 60 characters';
  end if;
  insert into public.groups (name, created_by) values (v_name, v_uid) returning id into v_id;
  insert into public.group_members (group_id, user_id, status, role, invited_by, responded_at)
    values (v_id, v_uid, 'accepted', 'admin', v_uid, now());
  insert into public.group_events (group_id, kind, actor_id) values (v_id, 'group_created', v_uid);
  return v_id;
end $$;

-- Invite by username or email. Only an accepted admin may invite. To avoid revealing which accounts exist, an unknown
-- person, yourself and someone already in the group all return quietly.
create function public.invite_to_group(p_group uuid, p_identifier text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_user();
  v_ident text := lower(btrim(coalesce(p_identifier, '')));
  v_target uuid;
  v_status text;
  v_active int;
begin
  if not exists (
    select 1 from public.group_members
    where group_id = p_group and user_id = v_uid and status = 'accepted' and role = 'admin'
  ) then
    raise exception 'only a group admin can invite' using errcode = '42501';
  end if;

  if position('@' in v_ident) > 0 then
    select u.id into v_target from auth.users u where lower(u.email) = v_ident;
  else
    select p.id into v_target from public.profiles p where p.username = v_ident;
  end if;
  if v_target is null or v_target = v_uid then
    return;
  end if;

  select status into v_status from public.group_members where group_id = p_group and user_id = v_target;
  if v_status in ('accepted', 'pending') then
    return;
  end if;

  select count(*) into v_active from public.group_members
    where group_id = p_group and status in ('accepted', 'pending');
  if v_active >= 20 then
    raise exception 'this group is full (20 people)';
  end if;

  insert into public.group_members (group_id, user_id, status, role, invited_by)
    values (p_group, v_target, 'pending', 'member', v_uid)
  on conflict (group_id, user_id) do update
    set status = 'pending', role = 'member', invited_by = excluded.invited_by,
        invited_at = now(), responded_at = null;
  insert into public.group_events (group_id, kind, actor_id, subject_id)
    values (p_group, 'invited', v_uid, v_target);
end $$;

-- What you have been invited to. This is all a pending invitee can see: a group name and who invited them.
create function public.my_invitations()
returns table (group_id uuid, group_name text, invited_by_username text, invited_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_user();
begin
  return query
    select m.group_id, g.name, p.username, m.invited_at
    from public.group_members m
    join public.groups g on g.id = m.group_id
    left join public.profiles p on p.id = m.invited_by
    where m.user_id = v_uid and m.status = 'pending'
    order by m.invited_at desc;
end $$;

create function public.respond_to_invitation(p_group uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_user();
begin
  update public.group_members
    set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now()
    where group_id = p_group and user_id = v_uid and status = 'pending';
  if not found then
    raise exception 'there is no pending invitation to answer';
  end if;
  insert into public.group_events (group_id, kind, actor_id)
    values (p_group, case when p_accept then 'joined' else 'declined' end, v_uid);
end $$;

-- Leave a group. Your entries stop being shared (they are removed from here; your own records stay on your phone).
-- If you were the last admin, the longest-standing member takes over; an empty group is deleted.
create function public.leave_group(p_group uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_user();
  v_role text;
  v_heir uuid;
begin
  select role into v_role from public.group_members
    where group_id = p_group and user_id = v_uid and status = 'accepted';
  if v_role is null then
    raise exception 'you are not an active member of this group';
  end if;

  delete from public.shared_entries where group_id = p_group and owner_id = v_uid;
  update public.group_members set status = 'left', role = 'member', responded_at = now()
    where group_id = p_group and user_id = v_uid;
  insert into public.group_events (group_id, kind, actor_id) values (p_group, 'left', v_uid);

  if v_role = 'admin' and not exists (
    select 1 from public.group_members where group_id = p_group and status = 'accepted' and role = 'admin'
  ) then
    select user_id into v_heir from public.group_members
      where group_id = p_group and status = 'accepted' order by invited_at, user_id limit 1;
    if v_heir is null then
      delete from public.groups where id = p_group;
    else
      update public.group_members set role = 'admin' where group_id = p_group and user_id = v_heir;
    end if;
  end if;
end $$;

-- An admin removes another member (or cancels a pending invitation). Their entries stop being shared.
create function public.remove_member(p_group uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_user();
  v_status text;
  v_role text;
begin
  if not exists (
    select 1 from public.group_members
    where group_id = p_group and user_id = v_uid and status = 'accepted' and role = 'admin'
  ) then
    raise exception 'only a group admin can remove someone' using errcode = '42501';
  end if;
  if p_user = v_uid then
    raise exception 'use leave to leave a group yourself';
  end if;
  select status, role into v_status, v_role from public.group_members
    where group_id = p_group and user_id = p_user;
  if v_status is null or v_status not in ('accepted', 'pending') then
    raise exception 'that person is not in this group';
  end if;
  if v_role = 'admin' then
    raise exception 'an admin cannot be removed; they can leave themselves';
  end if;

  delete from public.shared_entries where group_id = p_group and owner_id = p_user;
  update public.group_members set status = 'removed', responded_at = now()
    where group_id = p_group and user_id = p_user;
  insert into public.group_events (group_id, kind, actor_id, subject_id)
    values (p_group, 'removed', v_uid, p_user);
end $$;

create function public.list_my_groups()
returns table (group_id uuid, name text, role text, member_count bigint, entry_count bigint, created_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_user();
begin
  return query
    select g.id, g.name, m.role,
      (select count(*) from public.group_members x where x.group_id = g.id and x.status = 'accepted'),
      (select count(*) from public.shared_entries e where e.group_id = g.id),
      g.created_at
    from public.group_members m join public.groups g on g.id = m.group_id
    where m.user_id = v_uid and m.status = 'accepted'
    order by g.name, g.created_at;
end $$;

create function public.list_group_members(p_group uuid)
returns table (user_id uuid, username text, role text, status text, invited_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.require_user();
  if not public.is_member(p_group) then
    raise exception 'not a member of this group' using errcode = '42501';
  end if;
  return query
    select m.user_id, p.username, m.role, m.status, m.invited_at
    from public.group_members m join public.profiles p on p.id = m.user_id
    where m.group_id = p_group and m.status in ('accepted', 'pending')
    order by (m.status = 'accepted') desc, p.username;
end $$;

create function public.list_group_entries(p_group uuid)
returns table (
  id uuid, owner_id uuid, owner_username text, local_id text, kind text, amount bigint,
  entry_date date, note text, shared_at timestamptz, updated_at timestamptz
)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.require_user();
  if not public.is_member(p_group) then
    raise exception 'not a member of this group' using errcode = '42501';
  end if;
  return query
    select e.id, e.owner_id, p.username, e.local_id, e.kind, e.amount, e.entry_date, e.note,
           e.shared_at, e.updated_at
    from public.shared_entries e join public.profiles p on p.id = e.owner_id
    where e.group_id = p_group
    order by e.entry_date desc, e.shared_at desc, e.id;
end $$;

create function public.list_group_events(p_group uuid, p_limit int default 100)
returns table (id bigint, occurred_at timestamptz, kind text, actor_username text, subject_username text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.require_user();
  if not public.is_member(p_group) then
    raise exception 'not a member of this group' using errcode = '42501';
  end if;
  return query
    select ev.id, ev.occurred_at, ev.kind, a.username, s.username
    from public.group_events ev
    left join public.profiles a on a.id = ev.actor_id
    left join public.profiles s on s.id = ev.subject_id
    where ev.group_id = p_group
    order by ev.id desc
    limit greatest(1, least(coalesce(p_limit, 100), 500));
end $$;

-- Share (or re-share, which edits) one of your savings entries with a group you belong to.
-- An entry can be in only one group at a time: it is unique per owner and local id.
create function public.share_entry(
  p_group uuid, p_local_id text, p_kind text, p_amount bigint, p_date date, p_note text default ''
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_user();
  v_existing public.shared_entries;
  v_id uuid;
begin
  if not public.is_member(p_group) then
    raise exception 'you can only share with a group you belong to' using errcode = '42501';
  end if;
  if p_kind not in ('deposit', 'withdrawal') then
    raise exception 'kind must be deposit or withdrawal';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be more than zero';
  end if;
  if p_date is null or p_date > current_date + 1 then
    raise exception 'a saving cannot be dated in the future';
  end if;

  select * into v_existing from public.shared_entries where owner_id = v_uid and local_id = p_local_id;
  if found and v_existing.group_id <> p_group then
    raise exception 'this saving is already shared with another group; make it private first';
  end if;

  if found then
    update public.shared_entries
      set kind = p_kind, amount = p_amount, entry_date = p_date, note = left(coalesce(p_note, ''), 140),
          updated_at = now()
      where id = v_existing.id;
    v_id := v_existing.id;
    insert into public.group_events (group_id, kind, actor_id) values (p_group, 'entry_edited', v_uid);
  else
    insert into public.shared_entries (group_id, owner_id, local_id, kind, amount, entry_date, note)
      values (p_group, v_uid, p_local_id, p_kind, p_amount, p_date, left(coalesce(p_note, ''), 140))
      returning id into v_id;
    insert into public.group_events (group_id, kind, actor_id) values (p_group, 'entry_shared', v_uid);
  end if;
  return v_id;
end $$;

-- Make one of your entries private again. Quiet when it is not shared. Returns whether anything was removed.
create function public.unshare_entry(p_local_id text) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_user();
  v_group uuid;
begin
  delete from public.shared_entries where owner_id = v_uid and local_id = p_local_id
    returning group_id into v_group;
  if v_group is null then
    return false;
  end if;
  insert into public.group_events (group_id, kind, actor_id) values (v_group, 'entry_unshared', v_uid);
  return true;
end $$;

create function public.list_my_shared_entries()
returns table (id uuid, group_id uuid, local_id text, kind text, amount bigint, entry_date date, note text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_user();
begin
  return query
    select e.id, e.group_id, e.local_id, e.kind, e.amount, e.entry_date, e.note
    from public.shared_entries e
    where e.owner_id = v_uid and public.is_member(e.group_id)
    order by e.entry_date, e.id;
end $$;

-- The one source of truth for Shared Savings totals, so every member sees the same numbers.
--   period_net  = deposits minus withdrawals dated inside [p_from, p_to]
--   total_net   = deposits minus withdrawals dated on or before p_to (the cumulative shared balance at the end)
--   has_records = whether any shared entry is dated on or before p_to (otherwise there is no balance to report)
-- The opening balance of anyone's personal savings is never part of this: only explicitly shared entries are.
-- One row per accepted member plus one combined row (is_combined = true).
create function public.group_savings_summary(p_group uuid, p_from date, p_to date)
returns table (
  member_id uuid, username text, is_combined boolean,
  period_net bigint, total_net bigint, entries_in_period bigint, has_records boolean
)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.require_user();
  if not public.is_member(p_group) then
    raise exception 'not a member of this group' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'the end date cannot be before the start date';
  end if;
  return query
  with signed as (
    select e.owner_id, e.entry_date,
           case when e.kind = 'deposit' then e.amount else -e.amount end as delta
    from public.shared_entries e
    where e.group_id = p_group
  ),
  members as (
    select m.user_id, p.username
    from public.group_members m join public.profiles p on p.id = m.user_id
    where m.group_id = p_group and m.status = 'accepted'
  )
  select m.user_id, m.username, false,
    coalesce(sum(s.delta) filter (where s.entry_date between p_from and p_to), 0)::bigint,
    coalesce(sum(s.delta) filter (where s.entry_date <= p_to), 0)::bigint,
    count(s.delta) filter (where s.entry_date between p_from and p_to),
    coalesce(bool_or(s.entry_date <= p_to), false)
  from members m left join signed s on s.owner_id = m.user_id
  group by m.user_id, m.username
  union all
  select null::uuid, null::text, true,
    coalesce(sum(s.delta) filter (where s.entry_date between p_from and p_to), 0)::bigint,
    coalesce(sum(s.delta) filter (where s.entry_date <= p_to), 0)::bigint,
    count(s.delta) filter (where s.entry_date between p_from and p_to),
    coalesce(bool_or(s.entry_date <= p_to), false)
  from signed s
  order by 3 desc, 2;
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Function privileges: nobody by default; signed-in users get the API; only username_available is open to anon.
-- ---------------------------------------------------------------------------------------------------------------
revoke all on function
  public.handle_new_user(), public.profiles_username_immutable(), public.require_user(),
  public.is_member(uuid), public.shares_group_with(uuid),
  public.username_available(text), public.my_profile(), public.create_group(text),
  public.invite_to_group(uuid, text), public.my_invitations(), public.respond_to_invitation(uuid, boolean),
  public.leave_group(uuid), public.remove_member(uuid, uuid), public.list_my_groups(),
  public.list_group_members(uuid), public.list_group_entries(uuid), public.list_group_events(uuid, int),
  public.share_entry(uuid, text, text, bigint, date, text), public.unshare_entry(text),
  public.list_my_shared_entries(), public.group_savings_summary(uuid, date, date)
from public, anon, authenticated;

grant execute on function
  public.is_member(uuid), public.shares_group_with(uuid), public.require_user(),
  public.my_profile(), public.create_group(text), public.invite_to_group(uuid, text),
  public.my_invitations(), public.respond_to_invitation(uuid, boolean), public.leave_group(uuid),
  public.remove_member(uuid, uuid), public.list_my_groups(), public.list_group_members(uuid),
  public.list_group_entries(uuid), public.list_group_events(uuid, int),
  public.share_entry(uuid, text, text, bigint, date, text), public.unshare_entry(text),
  public.list_my_shared_entries(), public.group_savings_summary(uuid, date, date),
  public.username_available(text)
to authenticated;

grant execute on function public.username_available(text) to anon;

-- Live updates: members of a group are told when something in it changes. The event rows carry no amounts, and
-- Realtime applies the SELECT policy above, so only accepted members receive them.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.group_events;
  end if;
end $$;
