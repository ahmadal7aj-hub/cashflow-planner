-- Invite someone by email before they have an account. The invitation waits (stored under a hash of the address, never
-- the address itself) and turns into a normal pending invitation the moment somebody registers with that email. The
-- inviter always gets the same quiet answer, so nobody can find out who is registered. The invited person still has
-- to accept before they see anything.
create table public.pending_invites (
  group_id uuid not null references public.groups (id) on delete cascade,
  email_hash text not null check (email_hash ~ '^[0-9a-f]{64}$'),
  invited_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, email_hash)
);
create index pending_invites_hash_idx on public.pending_invites (email_hash);
alter table public.pending_invites enable row level security;
-- No policies and no grants: only the functions below (security definer) can touch it.
revoke all on public.pending_invites from anon, authenticated;

create function public.email_hash(p_email text) returns text
language sql immutable as $$
  select encode(sha256(convert_to(lower(btrim(coalesce(p_email, ''))), 'UTF8')), 'hex');
$$;
revoke all on function public.email_hash(text) from public, anon, authenticated;

-- Same as before, plus: an unknown email is remembered instead of being dropped.
create or replace function public.invite_to_group(p_group uuid, p_identifier text) returns void
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
    if v_target is null then
      -- Nobody has this email yet: keep the invitation for when somebody registers with it (at most 20 waiting).
      if v_ident ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
         and (select count(*) from public.pending_invites where group_id = p_group) < 20 then
        insert into public.pending_invites (group_id, email_hash, invited_by)
          values (p_group, public.email_hash(v_ident), v_uid)
        on conflict do nothing;
      end if;
      return;
    end if;
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

-- Same as before, plus: waiting invitations for this email become real pending invitations (valid for 30 days).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  v_phone text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');
  p record;
begin
  if v_name is not null and char_length(v_name) > 80 then v_name := null; end if;
  if v_phone is not null and v_phone !~ '^\+?[0-9 ()-]{6,20}$' then v_phone := null; end if;
  insert into public.profiles (id, username, full_name, phone)
  values (new.id, lower(coalesce(new.raw_user_meta_data ->> 'username', '')), v_name, v_phone);

  if new.email is not null then
    for p in
      select group_id, invited_by from public.pending_invites
      where email_hash = public.email_hash(new.email) and created_at > now() - interval '30 days'
    loop
      if (select count(*) from public.group_members
          where group_id = p.group_id and status in ('accepted', 'pending')) < 20 then
        insert into public.group_members (group_id, user_id, status, role, invited_by)
          values (p.group_id, new.id, 'pending', 'member', p.invited_by)
        on conflict (group_id, user_id) do nothing;
        insert into public.group_events (group_id, kind, actor_id, subject_id)
          values (p.group_id, 'invited', p.invited_by, new.id);
      end if;
    end loop;
    delete from public.pending_invites where email_hash = public.email_hash(new.email);
  end if;
  return new;
end $$;

revoke all on function public.invite_to_group(uuid, text) from public, anon, authenticated;
grant execute on function public.invite_to_group(uuid, text) to authenticated;
