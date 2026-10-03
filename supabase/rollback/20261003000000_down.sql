-- REMOVES the accounts and shared savings tables and functions. DESTRUCTIVE: all groups, memberships and shared
-- entries are deleted for everybody. Read docs/ROLLBACK.md first and export what you need.
--
-- It does NOT delete user accounts (auth.users); remove those in the Supabase dashboard if you want to.
-- It does not touch anything on anybody's phone: personal records are never stored here.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'group_events'
     ) then
    alter publication supabase_realtime drop table public.group_events;
  end if;
end $$;

drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.update_my_contact(text, text); -- from 20261004000000, if applied
drop function if exists public.group_savings_summary(uuid, date, date);
drop function if exists public.list_my_shared_entries();
drop function if exists public.unshare_entry(text);
drop function if exists public.share_entry(uuid, text, text, bigint, date, text);
drop function if exists public.list_group_events(uuid, int);
drop function if exists public.list_group_entries(uuid);
drop function if exists public.list_group_members(uuid);
drop function if exists public.list_my_groups();
drop function if exists public.remove_member(uuid, uuid);
drop function if exists public.leave_group(uuid);
drop function if exists public.respond_to_invitation(uuid, boolean);
drop function if exists public.my_invitations();
drop function if exists public.invite_to_group(uuid, text);
drop function if exists public.create_group(text);
drop function if exists public.my_profile();
drop function if exists public.username_available(text);
drop function if exists public.require_user();

drop table if exists public.group_events;
drop table if exists public.shared_entries;
drop table if exists public.group_members;
drop table if exists public.groups;
drop table if exists public.profiles;

drop function if exists public.shares_group_with(uuid);
drop function if exists public.is_member(uuid);
drop function if exists public.profiles_username_immutable();
drop function if exists public.handle_new_user();
