import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Browser client for Client Components. Safe to call repeatedly — cheap to construct.
// Docs: https://supabase.com/docs/guides/auth/server-side/nextjs
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
