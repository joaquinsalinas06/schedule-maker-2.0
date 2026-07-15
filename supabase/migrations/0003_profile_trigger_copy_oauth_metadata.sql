-- Copy OAuth metadata (Google name/avatar) into the profile on signup.
-- Anonymous users have no metadata -> columns stay null, same as before.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, first_name, last_name, nickname, profile_photo)
  values (
    new.id,
    'student',
    coalesce(new.raw_user_meta_data ->> 'given_name', split_part(new.raw_user_meta_data ->> 'full_name', ' ', 1)),
    coalesce(new.raw_user_meta_data ->> 'family_name', nullif(substring(new.raw_user_meta_data ->> 'full_name' from '\s(.*)$'), '')),
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
