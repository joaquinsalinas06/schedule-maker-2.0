/**
 * AuthSessionManager — Centralized session management with proactive token refresh.
 * 
 * Designed to be Supabase-compatible: when migrating to Supabase Auth,
 * only the token refresh method needs to change. The session lifecycle,
 * auto-refresh timer, and event system stay the same.
 */

type AuthStateChangeCallback = (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED', session: Session | null) => void;

interface Session {
  access_token: string;
  refresh_token: string | null;
  user: Record<string, unknown>;
  expires_at: number; // Unix timestamp in seconds
}

interface Unsubscribe {
  unsubscribe: () => void;
}

// Decode JWT payload without verification (just reads the payload)
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch {
    return null;
  }
}

// Get expiration time from a JWT token (in seconds since epoch)
function getTokenExpiry(token: string): number | null {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return null;
  return payload.exp;
}

// Check if a token is expired or will expire within the given margin (seconds)
function isTokenExpired(token: string, marginSeconds: number = 0): boolean {
  const exp = getTokenExpiry(token);
  if (exp === null) return true;
  const now = Math.floor(Date.now() / 1000);
  return now >= (exp - marginSeconds);
}

const REFRESH_MARGIN_SECONDS = 300; // Refresh 5 minutes before expiry
const REFRESH_CHECK_INTERVAL_MS = 60_000; // Check every minute
const TOKEN_STORAGE_KEY = 'token';
const REFRESH_TOKEN_STORAGE_KEY = 'refresh_token';
const USER_STORAGE_KEY = 'user';

class AuthSessionManagerImpl {
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<AuthStateChangeCallback> = new Set();
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    // On initialization, sync the cookie from localStorage if needed.
    // This handles users who were logged in before the middleware was deployed.
    this.syncCookieFromStorage();
  }

  /**
   * Sync the auth-token cookie from localStorage.
   * Handles the case where a user has a valid token in localStorage
   * but no cookie (e.g., they were logged in before the middleware was added).
   */
  syncCookieFromStorage(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return;

    // Check if the cookie already exists
    const hasCookie = document.cookie.split(';').some(c => c.trim().startsWith('auth-token='));
    if (hasCookie) return;

    // Token exists in localStorage but not as a cookie — sync it
    if (!isTokenExpired(token)) {
      this.setTokenCookie(token);
    }
  }

  /**
   * Get the current session from localStorage.
   * Returns null if no valid session exists.
   */
  getSession(): Session | null {
    if (typeof window === 'undefined') return null;

    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const userStr = localStorage.getItem(USER_STORAGE_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);

    if (!token || !userStr) return null;

    const expiresAt = getTokenExpiry(token);
    if (expiresAt === null) return null;

    try {
      const user = JSON.parse(userStr);
      return {
        access_token: token,
        refresh_token: refreshToken,
        user,
        expires_at: expiresAt,
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if the user is authenticated with a valid (non-expired) token.
   * This actually decodes the JWT to check expiration.
   */
  isAuthenticated(): boolean {
    const session = this.getSession();
    if (!session) return false;
    return !isTokenExpired(session.access_token);
  }

  /**
   * Get a valid access token. If the current token is expired or about to expire,
   * attempt a refresh first. Returns null if no valid token can be obtained.
   */
  async getValidToken(): Promise<string | null> {
    const session = this.getSession();
    if (!session) return null;

    // Token is still valid and not close to expiry
    if (!isTokenExpired(session.access_token, REFRESH_MARGIN_SECONDS)) {
      return session.access_token;
    }

    // Token is expired or about to expire, try to refresh
    if (session.refresh_token) {
      const newToken = await this.performRefresh();
      return newToken;
    }

    return null;
  }

  /**
   * Save a new session to localStorage and notify listeners.
   */
  setSession(accessToken: string, refreshToken: string | null, user: Record<string, unknown>): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    }

    // Also set token as a cookie for the Next.js middleware
    this.setTokenCookie(accessToken);

    this.notifyListeners('SIGNED_IN', this.getSession());
    this.startAutoRefresh();
  }

  /**
   * Clear the session and notify listeners.
   * Does NOT redirect — that's the responsibility of the component.
   */
  clearSession(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem('remember_me');

    // Clear the token cookie
    this.clearTokenCookie();

    this.stopAutoRefresh();
    this.notifyListeners('SIGNED_OUT', null);
  }

  /**
   * Subscribe to auth state changes. Returns an unsubscribe function.
   * Compatible with Supabase's onAuthStateChange API.
   */
  onAuthStateChange(callback: AuthStateChangeCallback): Unsubscribe {
    this.listeners.add(callback);
    return {
      unsubscribe: () => {
        this.listeners.delete(callback);
      },
    };
  }

  /**
   * Start the auto-refresh timer. Checks periodically if the token
   * needs to be refreshed proactively.
   */
  startAutoRefresh(): void {
    this.stopAutoRefresh();

    // Immediately check on start
    this.checkAndRefresh();

    this.refreshTimer = setInterval(() => {
      this.checkAndRefresh();
    }, REFRESH_CHECK_INTERVAL_MS);
  }

  /**
   * Stop the auto-refresh timer.
   */
  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Set the access token as a cookie for Next.js middleware access.
   */
  private setTokenCookie(token: string): void {
    if (typeof document === 'undefined') return;
    // SameSite=Lax is secure enough and works with redirects
    document.cookie = `auth-token=${token}; path=/; SameSite=Lax; max-age=${60 * 60 * 24 * 30}`;
  }

  /**
   * Clear the auth token cookie.
   */
  private clearTokenCookie(): void {
    if (typeof document === 'undefined') return;
    document.cookie = 'auth-token=; path=/; max-age=0';
  }

  /**
   * Check if the token needs refreshing and do it proactively.
   */
  private async checkAndRefresh(): Promise<void> {
    const session = this.getSession();
    if (!session || !session.refresh_token) return;

    // If token is expired or within the refresh margin, refresh it
    if (isTokenExpired(session.access_token, REFRESH_MARGIN_SECONDS)) {
      await this.performRefresh();
    }
  }

  /**
   * Perform the actual token refresh. Deduplicates concurrent calls.
   * This is the ONLY method that needs to change for Supabase migration.
   */
  private async performRefresh(): Promise<string | null> {
    // Deduplicate concurrent refresh requests
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.doRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Internal refresh implementation.
   * TODO: When migrating to Supabase, replace this with supabase.auth.refreshSession()
   */
  private async doRefresh(): Promise<string | null> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    if (!refreshToken) return null;

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        // Refresh failed — session is dead
        this.clearSession();
        return null;
      }

      const data = await response.json();
      const newToken = data.access_token;
      const user = data.user;

      // Update stored session
      localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      this.setTokenCookie(newToken);

      this.notifyListeners('TOKEN_REFRESHED', this.getSession());

      return newToken;
    } catch {
      // Network error — don't clear session, retry later
      console.warn('[AuthSessionManager] Refresh failed due to network error, will retry.');
      return null;
    }
  }

  private notifyListeners(event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED', session: Session | null): void {
    this.listeners.forEach((callback) => {
      try {
        callback(event, session);
      } catch (err) {
        console.error('[AuthSessionManager] Listener error:', err);
      }
    });
  }
}

// Singleton instance
export const authSessionManager = new AuthSessionManagerImpl();
export type { Session, AuthStateChangeCallback, Unsubscribe };
export { isTokenExpired, decodeJwtPayload, getTokenExpiry };
