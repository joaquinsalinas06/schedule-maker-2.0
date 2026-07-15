'use client'

import { useCallback, useEffect, useState } from 'react'
import * as data from '../data'
import type { FriendProfile, FriendScheduleDetail, FriendScheduleSummary } from '../types'

// Glue for the friend-profile modal: profile + on-demand schedule list/detail.
export function useFriendProfile(friendId: string | null) {
  const [profile, setProfile] = useState<FriendProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [schedules, setSchedules] = useState<FriendScheduleSummary[]>([])
  const [schedulesLoading, setSchedulesLoading] = useState(false)

  useEffect(() => {
    if (!friendId) {
      setProfile(null)
      setSchedules([])
      return
    }
    let cancelled = false
    setLoading(true)
    data
      .getFriendProfile(friendId)
      .then((p) => {
        if (!cancelled) setProfile(p)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [friendId])

  const loadSchedules = useCallback(async () => {
    if (!friendId) return
    setSchedulesLoading(true)
    try {
      setSchedules(await data.getFriendSchedules(friendId))
    } finally {
      setSchedulesLoading(false)
    }
  }, [friendId])

  const loadScheduleDetail = useCallback(
    async (scheduleId: string): Promise<FriendScheduleDetail> => {
      if (!friendId) throw new Error('No friend selected')
      return data.getFriendScheduleDetail(friendId, scheduleId)
    },
    [friendId]
  )

  return { profile, loading, schedules, schedulesLoading, loadSchedules, loadScheduleDetail }
}
