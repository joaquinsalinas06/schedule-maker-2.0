# Schedule Maker 2.0

Generador de horarios universitarios: busca cursos, arma combinaciones sin
choques, guarda tus favoritos y compartelos con companeros.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind, deployed on **Vercel**.
- **Supabase** for auth, Postgres, and storage (see `supabase/migrations`).

## Desarrollo

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in your Supabase project URL/keys
npm run dev
```

Database schema lives in `supabase/migrations`; apply it with the Supabase
CLI (`supabase db push`) against your project.

## Scripts (run inside `frontend/`)

- `npm run dev` - local dev server
- `npm run build` - production build
- `npm run test` - unit tests (Vitest)
- `npm run type-check` - `tsc --noEmit`

## Licencia

MIT - ver [LICENSE](LICENSE).
