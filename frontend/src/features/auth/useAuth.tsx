"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

interface AuthContextValue {
  user: User | null
  isAnonymous: boolean
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signInAnonymously: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const ensureSession = async () => {
      const { data } = await supabase.auth.getUser()
      if (cancelled) return

      if (data.user) {
        setUser(data.user)
      } else {
        // No session at all — start anonymous so the dashboard works pre-login.
        // See https://supabase.com/docs/guides/auth/auth-anonymous
        const { data: anon } = await supabase.auth.signInAnonymously()
        if (!cancelled) setUser(anon.user)
      }
      if (!cancelled) setLoading(false)
    }

    ensureSession()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [supabase])

  const isAnonymous = !!user?.is_anonymous

  const signInWithGoogle = useCallback(async () => {
    if (isAnonymous) {
      // Upgrade the anonymous user in place instead of creating a new account.
      await supabase.auth.linkIdentity({ provider: "google" })
    } else {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/dashboard` },
      })
    }
  }, [supabase, isAnonymous])

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    [supabase]
  )

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      if (isAnonymous) {
        // Anonymous -> permanent upgrade path per Supabase docs: updateUser
        // preserves the anonymous user's existing data instead of creating a new row.
        const { error } = await supabase.auth.updateUser({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      }
    },
    [supabase, isAnonymous]
  )

  // Exposed for entry points that need an explicit "continue without an
  // account" action (e.g. the auth page). Also serves as a manual retry if
  // the mount-time attempt in ensureSession above failed.
  const signInAnonymously = useCallback(async () => {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    setUser(data.user)
  }, [supabase])

  const signOut = useCallback(async () => {
    setUser(null)
    try {
      await supabase.auth.signOut()
    } catch {
      // Global sign-out can fail if the server session is already gone;
      // clear the local session regardless so the UI never stays "logged in".
      await supabase.auth.signOut({ scope: "local" }).catch(() => {})
    }
    // Dashboard is anon-accessible, so drop straight back into an anonymous
    // session rather than leaving the user with no session at all.
    const { data } = await supabase.auth.signInAnonymously()
    setUser(data.user)
  }, [supabase])

  const value: AuthContextValue = {
    user,
    isAnonymous,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInAnonymously,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
