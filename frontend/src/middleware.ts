import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware — Server-side route protection.
 * 
 * Reads the auth-token cookie (set by AuthSessionManager on the client)
 * and redirects unauthenticated users to /auth.
 * 
 * When migrating to Supabase, this becomes:
 *   import { createServerClient } from '@supabase/ssr'
 *   const { data: { session } } = await supabase.auth.getSession()
 * 
 * The logic stays the same — only the token source changes.
 */

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard', '/admin'];

// Routes that should redirect to dashboard if already authenticated
const AUTH_ROUTES = ['/auth', '/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;

  // Check if the route is protected
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route);

  if (isProtected && !token) {
    // No token → redirect to auth page
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    // Preserve the original URL as a redirect parameter
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && token) {
    // Already has token → redirect to dashboard
    // (basic check — the token might be expired, but the client-side
    // AuthSessionManager will handle refresh or redirect if needed)
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/auth',
    '/login',
  ],
};
