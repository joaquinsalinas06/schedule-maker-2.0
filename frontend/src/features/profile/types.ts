// Domain types for the profile feature, mapped from `public.profiles`
// (see supabase/migrations/0001_init.sql).

export interface ProfileUniversity {
  id: number
  name: string
  short_name: string
}

export interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  nickname: string | null
  profile_photo: string | null
  description: string | null
  student_id: string | null
  university_id: number | null
  curriculum_id: number | null
  role: string
  created_at: string
  updated_at: string
  university: ProfileUniversity | null
}

export interface ProfileUpdate {
  first_name?: string
  last_name?: string
  nickname?: string
  description?: string
  student_id?: string
  curriculum_id?: number | null
}
