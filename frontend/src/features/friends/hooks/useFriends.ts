'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth'
import * as data from '../data'
import { computeFriendshipStatus } from '../logic/friendStatus'
import type { FriendProfile, FriendRequestItem, SearchResult } from '../types'

export function useFriends() {
  const { user, isAnonymous } = useAuth()
  const [friends, setFriends] = useState<FriendProfile[]>([])
  const [requests, setRequests] = useState<{ received: FriendRequestItem[]; sent: FriendRequestItem[] }>({
    received: [],
    sent: [],
  })
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!user || isAnonymous) return
    setLoading(true)
    try {
      const [friendsList, reqs] = await Promise.all([data.listFriends(user.id), data.listFriendRequests(user.id)])
      setFriends(friendsList)
      setRequests(reqs)
    } finally {
      setLoading(false)
    }
  }, [user, isAnonymous])

  useEffect(() => {
    refetch()
  }, [refetch])

  const search = useCallback(
    async (query: string): Promise<SearchResult[]> => {
      if (!user) return []
      const results = await data.searchProfiles(query, user.id)
      const friendIds = new Set(friends.map((f) => f.id))
      const sentIds = new Set(requests.sent.map((r) => r.receiver?.id).filter((id): id is string => !!id))
      const receivedIds = new Set(requests.received.map((r) => r.sender?.id).filter((id): id is string => !!id))
      return results.map((r) => ({
        ...r,
        friendship_status: computeFriendshipStatus(r.id, {
          friendIds,
          sentPendingReceiverIds: sentIds,
          receivedPendingSenderIds: receivedIds,
        }),
      }))
    },
    [user, friends, requests]
  )

  const sendRequest = useCallback(
    async (receiverId: string) => {
      if (!user) throw new Error('Not authenticated')
      await data.sendFriendRequest(user.id, receiverId)
      await refetch()
    },
    [user, refetch]
  )

  const acceptRequest = useCallback(
    async (requestId: number) => {
      await data.acceptFriendRequest(requestId)
      await refetch()
    },
    [refetch]
  )

  const rejectRequest = useCallback(
    async (requestId: number) => {
      await data.rejectFriendRequest(requestId)
      await refetch()
    },
    [refetch]
  )

  const cancelRequest = useCallback(
    async (requestId: number) => {
      await data.cancelFriendRequest(requestId)
      await refetch()
    },
    [refetch]
  )

  const removeFriend = useCallback(
    async (friendId: string) => {
      if (!user) throw new Error('Not authenticated')
      await data.removeFriend(user.id, friendId)
      await refetch()
    },
    [user, refetch]
  )

  return {
    friends,
    requests,
    loading,
    isAnonymous,
    search,
    sendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    removeFriend,
    refetch,
  }
}
