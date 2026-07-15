# Supabase migration

Schema lives in `supabase/migrations/0001_init.sql`. It replaces the FastAPI +
Railway Postgres backend: catalog tables (universities/courses/sections/
sessions/curricula/curriculum_courses/curriculum_prerequisites) match the old
SQLAlchemy models column-for-column so an old `pg_dump --data-only
--column-inserts` restores cleanly. `users` is replaced by `auth.users` +
`public.profiles`.

## Apply the migration

Linked to a Supabase project (recommended):

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Or paste `supabase/migrations/0001_init.sql` into the dashboard's SQL Editor
and run it (Project > SQL Editor > New query).

After restoring old catalog data with explicit ids, resync the identity
sequences, e.g.:

```sql
select setval(pg_get_serial_sequence('public.courses', 'id'), max(id)) from public.courses;
```

(repeat per table that received explicit-id inserts).

## Dashboard setup (one-time, per project)

1. **Anonymous sign-in**: Authentication > Providers > enable "Anonymous
   Sign-ins". Needed because `handle_new_user()` creates a `profiles` row for
   every `auth.users` insert, anonymous included.
2. **Google provider**: Authentication > Providers > Google > enable, set
   Client ID / Secret, and add the Supabase callback URL to the Google Cloud
   OAuth consent screen's authorized redirect URIs.

## Generate TypeScript types

```bash
supabase gen types typescript --linked > frontend/src/types/database.ts
```

Run this again any time the schema changes.
