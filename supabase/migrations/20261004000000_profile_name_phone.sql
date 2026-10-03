-- Optional contact details on a profile: a display name and a phone number.
-- Both are shown only to their owner on the profile page. They are NOT used to find or invite people: the phone
-- number is not verified, so anyone could type somebody else's number. People are found by username or email.
alter table public.profiles
  add column full_name text check (full_name is null or char_length(full_name) between 1 and 80),
  add column phone text check (phone is null or phone ~ '^\+?[0-9 ()-]{6,20}$');

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  v_phone text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');
begin
  -- A badly formatted optional detail must never block registration; it is simply left empty.
  if v_name is not null and char_length(v_name) > 80 then v_name := null; end if;
  if v_phone is not null and v_phone !~ '^\+?[0-9 ()-]{6,20}$' then v_phone := null; end if;
  insert into public.profiles (id, username, full_name, phone)
  values (new.id, lower(coalesce(new.raw_user_meta_data ->> 'username', '')), v_name, v_phone);
  return new;
end $$;

drop function public.my_profile();
create function public.my_profile()
returns table (id uuid, username text, email text, full_name text, phone text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_user();
begin
  return query
    select p.id, p.username, u.email::text, p.full_name, p.phone
    from public.profiles p join auth.users u on u.id = p.id
    where p.id = v_uid;
end $$;

-- Change your own name and phone (empty clears them). Only your own row can change; the username never can.
create function public.update_my_contact(p_full_name text, p_phone text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_user();
  v_name text := nullif(btrim(coalesce(p_full_name, '')), '');
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
begin
  if v_name is not null and char_length(v_name) > 80 then
    raise exception 'name must be at most 80 characters';
  end if;
  if v_phone is not null and v_phone !~ '^\+?[0-9 ()-]{6,20}$' then
    raise exception 'phone number looks wrong';
  end if;
  update public.profiles set full_name = v_name, phone = v_phone where id = v_uid;
end $$;

revoke all on function public.my_profile(), public.update_my_contact(text, text) from public, anon, authenticated;
grant execute on function public.my_profile(), public.update_my_contact(text, text) to authenticated;
