// ONLY file in this feature that touches supabase.
//
// Table shapes: supabase/migrations/0001_init.sql
//   curricula, curriculum_courses, curriculum_prerequisites -- public read.
//   user_curriculum_progress -- owner-only RLS, unique(user_id, curriculum_course_id).
//     Progress *and* planning (planned_period, linked_course_override) live on
//     the same row per curriculum_course_id, so both are read/written together.
//   profiles.curriculum_id -- the user's currently selected curriculum.

import { createClient } from '@/lib/supabase/client'
import type { CurriculumListItem, CurriculumTree, CurriculumCourse } from './types'

// Progress/planning/profile calls act on the signed-in user (anonymous users
// included -- see features/auth: anon sessions can save progress, upgraded
// in place on sign-in). Resolved here rather than threaded through the store
// so the store's public interface stays exactly what CurriculumGraph expects.
async function getCurrentUserId(): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('No authenticated user')
  return data.user.id
}

interface RawCurriculumCourseRow {
  id: number
  course_name: string
  semester: number
  credits: number
  is_elective: boolean
  elective_group: string | null
  linked_course_id: number | null
  curriculum_prerequisites: {
    id: number
    prerequisite_course_id: number | null
    prerequisite_type: 'course' | 'credits'
    required_credits: number | null
    prerequisite_course: { course_name: string } | null
  }[]
}

export async function listCurricula(universityId?: number): Promise<CurriculumListItem[]> {
  const supabase = createClient()
  let query = supabase
    .from('curricula')
    .select('id, name, code, year, total_credits, total_semesters')
    .eq('is_active', true)
  if (universityId) query = query.eq('university_id', universityId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as CurriculumListItem[]
}

export async function getCurriculumTree(curriculumId: number): Promise<CurriculumTree> {
  const supabase = createClient()

  const { data: curriculum, error: curriculumError } = await supabase
    .from('curricula')
    .select('id, name, code, year, total_credits, total_semesters')
    .eq('id', curriculumId)
    .single()
  if (curriculumError) throw curriculumError

  const { data: courses, error: coursesError } = await supabase
    .from('curriculum_courses')
    .select(
      `id, course_name, semester, credits, is_elective, elective_group, linked_course_id,
       curriculum_prerequisites!curriculum_prerequisites_curriculum_course_id_fkey(
         id, prerequisite_course_id, prerequisite_type, required_credits,
         prerequisite_course:curriculum_courses!curriculum_prerequisites_prerequisite_course_id_fkey(course_name)
       )`,
    )
    .eq('curriculum_id', curriculumId)
    .eq('is_active', true)
  if (coursesError) throw coursesError

  const mappedCourses: CurriculumCourse[] = ((courses ?? []) as unknown as RawCurriculumCourseRow[]).map((c) => ({
    id: c.id,
    course_name: c.course_name,
    semester: c.semester,
    credits: c.credits,
    is_elective: c.is_elective,
    elective_group: c.elective_group,
    linked_course_id: c.linked_course_id,
    prerequisites: (c.curriculum_prerequisites ?? []).map((p) => ({
      id: p.id,
      prerequisite_course_id: p.prerequisite_course_id,
      prerequisite_type: p.prerequisite_type,
      required_credits: p.required_credits,
      prerequisite_course_name: p.prerequisite_course?.course_name ?? null,
    })),
  }))

  return { ...curriculum, courses: mappedCourses } as CurriculumTree
}

export interface UserProgressRow {
  curriculum_course_id: number
  status: 'completed' | 'in_progress' | 'pending'
  completed_at: string | null
  planned_period: string | null
  linked_course_override: number | null
  linked_course_name: string | null
}

/** One row per curriculum_course_id the user has touched (status, planned period, elective link). */
export async function getUserProgress(curriculumId: number): Promise<UserProgressRow[]> {
  const userId = await getCurrentUserId()
  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_curriculum_progress')
    .select(
      'curriculum_course_id, status, completed_at, planned_period, linked_course_override, linked_course:courses(name)',
    )
    .eq('user_id', userId)
    .eq('curriculum_id', curriculumId)
  if (error) throw error

  return ((data ?? []) as unknown as Array<{
    curriculum_course_id: number
    status: 'completed' | 'in_progress' | 'pending'
    completed_at: string | null
    planned_period: string | null
    linked_course_override: number | null
    linked_course: { name: string } | null
  }>).map((row) => ({
    curriculum_course_id: row.curriculum_course_id,
    status: row.status,
    completed_at: row.completed_at,
    planned_period: row.planned_period,
    linked_course_override: row.linked_course_override,
    linked_course_name: row.linked_course?.name ?? null,
  }))
}

export interface ProgressUpsertRow {
  curriculum_course_id: number
  // ponytail: all three columns are required (not optional) even though a
  // given flush usually only *changes* one of them -- postgrest builds one
  // insert statement for the whole batch, so a row missing a key would get
  // that column nulled on conflict instead of left alone. The caller (the
  // store's flush) merges pending edits with current state before calling
  // this so every row carries its real current value for all three.
  status: string
  planned_period: string | null
  linked_course_override: number | null
}

/** Single bulk upsert for status + planning changes accumulated by the debounced flush. */
export async function upsertProgress(curriculumId: number, rows: ProgressUpsertRow[]): Promise<void> {
  if (rows.length === 0) return
  const userId = await getCurrentUserId()
  const supabase = createClient()
  const { error } = await supabase.from('user_curriculum_progress').upsert(
    rows.map((r) => ({
      user_id: userId,
      curriculum_id: curriculumId,
      curriculum_course_id: r.curriculum_course_id,
      status: r.status,
      planned_period: r.planned_period,
      linked_course_override: r.linked_course_override,
    })),
    { onConflict: 'user_id,curriculum_course_id' },
  )
  if (error) throw error
}

export async function getUserCurriculumId(): Promise<number | null> {
  const userId = await getCurrentUserId()
  const supabase = createClient()
  const { data, error } = await supabase.from('profiles').select('curriculum_id').eq('id', userId).single()
  if (error) throw error
  return data?.curriculum_id ?? null
}

export async function setUserCurriculum(curriculumId: number | null): Promise<void> {
  const userId = await getCurrentUserId()
  const supabase = createClient()
  const { error } = await supabase.from('profiles').update({ curriculum_id: curriculumId }).eq('id', userId)
  if (error) throw error
}
