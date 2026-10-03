-- Undoes 20261004000000_profile_name_phone.sql. DESTRUCTIVE only for the name and phone values (they are deleted).
-- Accounts, groups and shared savings are untouched.
drop function if exists public.update_my_contact(text, text);
drop function if exists public.my_profile();
create function public.my_profile() returns table (id uuid, username text, email text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_user();
begin
  return query
    select p.id, p.username, u.email::text
    from public.profiles p join auth.users u on u.id = p.id
    where p.id = v_uid;
end $$;
revoke all on function public.my_profile() from public, anon, authenticated;
grant execute on function public.my_profile() to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, username)
  values (new.id, lower(coalesce(new.raw_user_meta_data ->> 'username', '')));
  return new;
end $$;

alter table public.profiles drop column if exists phone, drop column if exists full_name;
