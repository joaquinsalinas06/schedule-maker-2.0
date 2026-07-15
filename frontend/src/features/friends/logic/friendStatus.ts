// Pure rule: derive a friendship status for a search result from the sets of
// ids already known to the caller. No react, no supabase.

import type { FriendshipStatus } from '../types'

export interface FriendStatusContext {
  friendIds: Set<string>
  sentPendingReceiverIds: Set<string>
  receivedPendingSenderIds: Set<string>
}

export function computeFriendshipStatus(profileId: string, ctx: FriendStatusContext): FriendshipStatus {
  if (ctx.friendIds.has(profileId)) return 'friends'
  if (ctx.sentPendingReceiverIds.has(profileId)) return 'request_sent'
  if (ctx.receivedPendingSenderIds.has(profileId)) return 'request_received'
  return 'none'
}
