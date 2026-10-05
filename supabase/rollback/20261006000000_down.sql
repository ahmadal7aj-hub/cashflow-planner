-- Undoes 20261006000000_pending_email_invites.sql: forgets invitations that are waiting for an email to register and
-- restores the two functions as they were. Invitations already turned into normal pending ones are kept.
drop table if exists public.pending_invites;
drop function if exists public.email_hash(text);

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

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  v_phone text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');
begin
  if v_name is not null and char_length(v_name) > 80 then v_name := null; end if;
  if v_phone is not null and v_phone !~ '^\+?[0-9 ()-]{6,20}$' then v_phone := null; end if;
  insert into public.profiles (id, username, full_name, phone)
  values (new.id, lower(coalesce(new.raw_user_meta_data ->> 'username', '')), v_name, v_phone);
  return new;
end $$;
