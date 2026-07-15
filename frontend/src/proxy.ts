import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Next.js 16 renamed middleware.ts -> proxy.ts (exported fn `proxy` instead of
// `middleware`). This proxy ONLY refreshes the Supabase session cookie on every
// request — it does not gate routes. Dashboard is anon-accessible; route-level
// auth checks (if ever needed) belong in the route/page itself via getClaims().
// Docs: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
//       https://supabase.com/docs/guides/auth/server-side/nextjs
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Triggers a token refresh (writing new cookies via setAll above) if the
  // access token is expired. Do not remove this call — without it, sessions
  // silently expire client-side. Never trust getSession() here per Supabase docs.
  await supabase.auth.getClaims()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
