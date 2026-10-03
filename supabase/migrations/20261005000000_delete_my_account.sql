-- Lets a signed-in person delete their own account and everything stored about them on the server.
-- Their personal records are never stored here (they live on their phone), so only the account, profile,
-- memberships and the savings they shared are removed. Groups carry on for the other members.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_user();
  g record;
  v_heir uuid;
begin
  for g in
    select m.group_id from public.group_members m
    where m.user_id = v_uid and m.status = 'accepted'
  loop
    -- The next oldest accepted member, preferring an admin.
    select m.user_id into v_heir
      from public.group_members m
      where m.group_id = g.group_id and m.status = 'accepted' and m.user_id <> v_uid
      order by (m.role = 'admin') desc, m.invited_at, m.user_id
      limit 1;
    if v_heir is null then
      -- Nobody else is in the group: it goes with the account (members, entries and history cascade).
      delete from public.groups where id = g.group_id;
    else
      update public.group_members set role = 'admin'
        where group_id = g.group_id and user_id = v_heir
          and not exists (
            select 1 from public.group_members a
            where a.group_id = g.group_id and a.user_id <> v_uid
              and a.status = 'accepted' and a.role = 'admin'
          );
      update public.groups set created_by = v_heir where id = g.group_id and created_by = v_uid;
    end if;
  end loop;

  -- A group this person created but has since left: hand it to a remaining member, or remove it if nobody is left.
  for g in select id from public.groups where created_by = v_uid loop
    select m.user_id into v_heir
      from public.group_members m
      where m.group_id = g.id and m.status = 'accepted' and m.user_id <> v_uid
      order by (m.role = 'admin') desc, m.invited_at, m.user_id
      limit 1;
    if v_heir is null then
      delete from public.groups where id = g.id;
    else
      update public.groups set created_by = v_heir where id = g.id;
    end if;
  end loop;
  update public.group_members set invited_by = null where invited_by = v_uid;
  -- Cascades remove the profile, memberships and shared entries; history rows keep no name (set null).
  delete from auth.users where id = v_uid;
end $$;

revoke all on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.delete_my_account() to authenticated;
