'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth'
import * as data from '../data'
import type { Profile, ProfileUpdate } from '../types'

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setProfile(await data.getProfile(user.id))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refetch()
  }, [refetch])

  const updateProfile = useCallback(
    async (patch: ProfileUpdate) => {
      if (!user) throw new Error('Not authenticated')
      const updated = await data.updateProfile(user.id, patch)
      setProfile(updated)
      return updated
    },
    [user]
  )

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!user) throw new Error('Not authenticated')
      const url = await data.uploadAvatar(user.id, file)
      setProfile((prev) => (prev ? { ...prev, profile_photo: url } : prev))
      return url
    },
    [user]
  )

  return { profile, loading, email: user?.email ?? null, updateProfile, uploadAvatar, refetch }
}
