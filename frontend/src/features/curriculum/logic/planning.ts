// Pure period-planning rules: current period derivation, period format
// validation, whether a course may be planned, and filtering the planned
// list for display (elective links override the linked course shown).

import type { CurriculumCourse, CourseStatus } from '../types'

const PERIOD_FORMAT = /^\d{4}-[12]$/

/** "2026-1" (Jan-Jun) or "2026-2" (Jul-Dec) for the given date (defaults to now). */
export function getCurrentPeriod(now: Date = new Date()): string {
  const year = now.getFullYear()
  const semester = now.getMonth() < 6 ? 1 : 2
  return `${year}-${semester}`
}

/** A planning period must be "<year>-1" or "<year>-2", e.g. "2026-2". */
export function isValidPlanningPeriod(period: string): boolean {
  return PERIOD_FORMAT.test(period)
}

/** Only unlocked, not-yet-completed courses can be scheduled for a future period. */
export function canPlanCourse(status: CourseStatus): boolean {
  return status !== 'locked' && status !== 'completed'
}

/** Courses planned for `period`, with elective links substituted in (name + linked id). */
export function getPlannedCoursesForPeriod(
  courses: CurriculumCourse[],
  plannedPeriods: Map<number, string>,
  electiveLinks: Map<number, { courseId: number; courseName: string }>,
  period: string,
): CurriculumCourse[] {
  return courses
    .filter((c) => plannedPeriods.get(c.id) === period)
    .map((c) => {
      const link = electiveLinks.get(c.id)
      if (link) {
        return { ...c, linked_course_id: link.courseId, course_name: link.courseName }
      }
      return c
    })
}
