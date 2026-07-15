// ONLY file in this feature that touches supabase.

import { createClient } from '@/lib/supabase/client'
import type { Profile, ProfileUpdate } from './types'

const PROFILE_COLS =
  'id, first_name, last_name, nickname, profile_photo, description, student_id, university_id, curriculum_id, role, created_at, updated_at, university:universities(id, name, short_name)'

export async function getProfile(userId: string): Promise<Profile> {
  const supabase = createClient()
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLS).eq('id', userId).single()
  if (error) throw error
  return data as unknown as Profile
}

export async function updateProfile(userId: string, patch: ProfileUpdate): Promise<Profile> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select(PROFILE_COLS)
    .single()
  if (error) throw error
  return data as unknown as Profile
}

// Uploads to the shared 'avatars' bucket at `${userId}/avatar.<ext>` (path convention
// enforced by storage RLS: first path segment must equal auth.uid()), then stores the
// public URL on profiles.profile_photo. Replaces the old Cloudinary upload entirely.
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (uploadError) throw uploadError

  const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)
  // Cache-bust so the browser doesn't keep showing the old avatar at the same URL.
  const url = `${publicUrlData.publicUrl}?t=${Date.now()}`

  const { error: updateError } = await supabase.from('profiles').update({ profile_photo: url }).eq('id', userId)
  if (updateError) throw updateError

  return url
}
