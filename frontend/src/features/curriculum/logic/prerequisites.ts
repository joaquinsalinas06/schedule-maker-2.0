// Pure prerequisite-unlocking rules. No react, no supabase — mirrors
// backend/app/services/curriculum_service.py::_compute_unlocked so client-side
// unlock state matches what the old FastAPI endpoint used to return.

import type { CurriculumCourse, CourseStatus, ProgressSummary } from '../types'

export interface UnlockResult {
  unlockedIds: Set<number>
  completedIds: Set<number>
  totalCredits: number
}

/**
 * Given the full course list and a status-per-course lookup, compute which
 * courses are unlocked: electives are always unlocked (until completed);
 * others need every "course" prerequisite completed and every "credits"
 * prerequisite's threshold met by total earned credits.
 */
export function computeUnlocked(
  courses: CurriculumCourse[],
  getStatus: (courseId: number) => 'completed' | 'in_progress' | 'pending',
): UnlockResult {
  const completedIds = new Set<number>()
  let totalCredits = 0

  for (const course of courses) {
    if (getStatus(course.id) === 'completed') {
      completedIds.add(course.id)
      totalCredits += course.credits
    }
  }

  const unlockedIds = new Set<number>()
  for (const course of courses) {
    if (completedIds.has(course.id)) continue

    if (course.is_elective) {
      unlockedIds.add(course.id)
      continue
    }

    const allPrereqsMet = course.prerequisites.every((prereq) => {
      if (prereq.prerequisite_type === 'credits') {
        return totalCredits >= (prereq.required_credits || 0)
      }
      if (prereq.prerequisite_type === 'course' && prereq.prerequisite_course_id) {
        return completedIds.has(prereq.prerequisite_course_id)
      }
      return true
    })

    if (course.prerequisites.length === 0 || allPrereqsMet) {
      unlockedIds.add(course.id)
    }
  }

  return { unlockedIds, completedIds, totalCredits }
}

/** Mirrors backend/app/services/curriculum_service.py::get_progress summary math. */
export function computeSummary(
  courses: CurriculumCourse[],
  getStatus: (courseId: number) => 'completed' | 'in_progress' | 'pending',
  totalCreditsInCurriculum: number,
  unlockedCount: number,
): ProgressSummary {
  let completed = 0
  let inProgress = 0
  let creditsEarned = 0

  for (const course of courses) {
    const status = getStatus(course.id)
    if (status === 'completed') {
      completed += 1
      creditsEarned += course.credits
    } else if (status === 'in_progress') {
      inProgress += 1
    }
  }

  return {
    completed,
    in_progress: inProgress,
    total: courses.length,
    credits_earned: creditsEarned,
    credits_total: totalCreditsInCurriculum,
    percentage: totalCreditsInCurriculum > 0 ? Math.round((creditsEarned / totalCreditsInCurriculum) * 1000) / 10 : 0,
    unlocked_count: unlockedCount,
  }
}

export interface CourseStatusInputs {
  courseId: number
  serverStatus: 'completed' | 'in_progress' | 'pending' | undefined
  localOverride: string | undefined
  isElective: boolean
  isUnlocked: boolean
  hasPlannedPeriod: boolean
}

/** Resolve the display status for one course (local override wins over server, then unlock/plan state). */
export function computeCourseStatus(inputs: CourseStatusInputs): CourseStatus {
  const { serverStatus, localOverride, isElective, isUnlocked, hasPlannedPeriod } = inputs

  if (localOverride === 'completed') return 'completed'
  if (localOverride === 'in_progress') return 'in_progress'

  if (serverStatus === 'completed') return 'completed'
  if (serverStatus === 'in_progress') return 'in_progress'

  const unlocked = isElective || isUnlocked
  if (unlocked && hasPlannedPeriod) return 'planned'
  if (unlocked) return 'unlocked'
  return 'locked'
}
