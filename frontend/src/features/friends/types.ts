// Domain types for the friends feature, mapped from `profiles` / `friend_requests`
// (see supabase/migrations/0001_init.sql).

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected'

export interface FriendUniversity {
  id: number
  name: string
  short_name: string
}

export interface FriendProfile {
  id: string
  first_name: string | null
  last_name: string | null
  nickname: string | null
  profile_photo: string | null
  description: string | null
  student_id: string | null
  university: FriendUniversity | null
}

export type FriendshipStatus = 'none' | 'friends' | 'request_sent' | 'request_received'

export interface SearchResult extends FriendProfile {
  friendship_status: FriendshipStatus
}

export interface FriendRequestItem {
  id: number
  message: string | null
  created_at: string
  sender: FriendProfile | null
  receiver: FriendProfile | null
}

export interface FriendScheduleSummary {
  id: string
  name: string | null
  is_favorite: boolean
  created_at: string
}

export interface CombinationSessionDetail {
  session_id: number
  session_type?: string | null
  day: string | number | null
  start_time: string
  end_time: string
  location?: string | null
  modality?: string | null
}

export interface CombinationCourseDetail {
  course_id: number
  course_code: string
  course_name: string
  section_id: number
  section_number: string
  professor?: string | null
  sessions: CombinationSessionDetail[]
}

export interface FriendScheduleDetail extends FriendScheduleSummary {
  combination_data: {
    courses: CombinationCourseDetail[]
  } | null
}
