// ONLY file in this feature that touches supabase.

import { createClient } from '@/lib/supabase/client'
import type { FriendProfile, FriendRequestItem, FriendScheduleSummary, FriendScheduleDetail } from './types'

const PROFILE_COLS =
  'id, first_name, last_name, nickname, profile_photo, description, student_id, university:universities(id, name, short_name)'

export async function searchProfiles(query: string, excludeUserId: string): Promise<FriendProfile[]> {
  const supabase = createClient()
  const escaped = query.replace(/[%,]/g, '')
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLS)
    .neq('id', excludeUserId)
    .or(`nickname.ilike.%${escaped}%,first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%`)
    .limit(20)
  if (error) throw error
  return (data ?? []) as unknown as FriendProfile[]
}

export async function listFriends(userId: string): Promise<FriendProfile[]> {
  const supabase = createClient()
  const { data: rows, error } = await supabase
    .from('friend_requests')
    .select('sender_id, receiver_id')
    .eq('status', 'accepted')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
  if (error) throw error

  const otherIds = (rows ?? [])
    .map((r) => (r.sender_id === userId ? r.receiver_id : r.sender_id))
    .filter((id): id is string => id !== null)
  if (otherIds.length === 0) return []

  const { data: profiles, error: profErr } = await supabase.from('profiles').select(PROFILE_COLS).in('id', otherIds)
  if (profErr) throw profErr
  return (profiles ?? []) as unknown as FriendProfile[]
}

export async function listFriendRequests(
  userId: string
): Promise<{ received: FriendRequestItem[]; sent: FriendRequestItem[] }> {
  const supabase = createClient()
  const { data: rows, error } = await supabase
    .from('friend_requests')
    .select('id, sender_id, receiver_id, message, created_at')
    .eq('status', 'pending')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
  if (error) throw error

  const all = rows ?? []
  const ids = Array.from(new Set(all.flatMap((r) => [r.sender_id, r.receiver_id]))).filter(
    (id): id is string => id !== null
  )

  let profiles: FriendProfile[] = []
  if (ids.length > 0) {
    const { data: profileRows, error: profErr } = await supabase.from('profiles').select(PROFILE_COLS).in('id', ids)
    if (profErr) throw profErr
    profiles = (profileRows ?? []) as unknown as FriendProfile[]
  }
  const byId = new Map(profiles.map((p) => [p.id, p]))

  const received: FriendRequestItem[] = []
  const sent: FriendRequestItem[] = []
  for (const r of all) {
    const item: FriendRequestItem = {
      id: r.id,
      message: r.message,
      created_at: r.created_at ?? '',
      sender: r.sender_id ? byId.get(r.sender_id) ?? null : null,
      receiver: r.receiver_id ? byId.get(r.receiver_id) ?? null : null,
    }
    if (r.receiver_id === userId) received.push(item)
    else sent.push(item)
  }
  return { received, sent }
}

export async function sendFriendRequest(senderId: string, receiverId: string, message?: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('friend_requests').insert({ sender_id: senderId, receiver_id: receiverId, message })
  if (error) throw error
}

export async function acceptFriendRequest(requestId: number): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', requestId)
  if (error) throw error
}

export async function rejectFriendRequest(requestId: number): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'rejected', responded_at: new Date().toISOString() })
    .eq('id', requestId)
  if (error) throw error
}

export async function cancelFriendRequest(requestId: number): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('friend_requests').delete().eq('id', requestId)
  if (error) throw error
}

export async function removeFriend(userId: string, friendId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('friend_requests')
    .delete()
    .eq('status', 'accepted')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
  if (error) throw error
}

export async function getFriendProfile(friendId: string): Promise<FriendProfile> {
  const supabase = createClient()
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLS).eq('id', friendId).single()
  if (error) throw error
  return data as unknown as FriendProfile
}

export async function getFriendSchedules(friendId: string): Promise<FriendScheduleSummary[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('schedules')
    .select('id, name, is_favorite, created_at')
    .eq('user_id', friendId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as FriendScheduleSummary[]
}

export async function getFriendScheduleDetail(friendId: string, scheduleId: string): Promise<FriendScheduleDetail> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('schedules')
    .select('id, name, is_favorite, created_at, combination_data')
    .eq('user_id', friendId)
    .eq('id', scheduleId)
    .single()
  if (error) throw error
  return data as unknown as FriendScheduleDetail
}
