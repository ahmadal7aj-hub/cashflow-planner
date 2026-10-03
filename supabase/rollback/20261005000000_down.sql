-- Undoes 20261005000000_delete_my_account.sql: removes the function. Accounts already deleted stay deleted.
drop function if exists public.delete_my_account();
