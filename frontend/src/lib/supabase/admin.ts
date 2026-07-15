import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Service-role client for server-only admin operations (bypasses RLS).
// NEVER import this from a Client Component — SUPABASE_SERVICE_ROLE_KEY must
// stay server-side. Construct fresh per call; the client itself is cheap.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
