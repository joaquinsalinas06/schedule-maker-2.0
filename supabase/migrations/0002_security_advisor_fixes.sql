-- Advisor fixes after 0001_init (applied to remote 2026-07-15):
-- 1. Pin search_path on set_updated_at (function_search_path_mutable).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2. handle_new_user is a SECURITY DEFINER trigger function; it must not be
--    callable through the Data API RPC surface by anon/authenticated.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 3. avatars bucket is public: object URLs work without a SELECT policy on
--    storage.objects, and the broad policy allowed listing every file.
drop policy if exists "avatars: public read" on storage.objects;
