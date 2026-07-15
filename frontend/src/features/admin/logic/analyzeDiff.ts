// Pure diff/preview logic for the "update" analyze mode + shared preview
// builder for "reset" mode. Ported from backend/app/services/import_service.py
// (_detect_diffs / _to_preview_dict). Takes plain data in (parsed CSV rows +
// already-fetched DB rows) and returns plain data out — no supabase import,
// so the route handler stays the only place that talks to the database.
import type { CourseImportRow, CoursePreview, ImportAnalysis, ImportMode, SectionPreview } from "../types"

export interface ExistingCourse {
  id: number
  code: string
  name: string
  department: string | null
}

export interface ExistingSection {
  id: number
  course_id: number
  section_number: string
  professor: string | null
  capacity: number | null
}

export interface ExistingSession {
  id: number
  section_id: number
  day: string
  start_time: string // "HH:MM:SS" from postgres `time`
}

const DAY_ABBR: Record<string, string> = {
  Monday: "Mo",
  Tuesday: "Tu",
  Wednesday: "We",
  Thursday: "Th",
  Friday: "Fr",
  Saturday: "Sa",
  Sunday: "Su",
}

function toPreview(course: CourseImportRow, isNew = false, diffs: string[] = []): CoursePreview {
  const sections: SectionPreview[] = course.sections.map((s) => ({
    number: s.section_number,
    professor: s.professor,
    capacity: s.capacity,
    sessions: s.sessions,
  }))
  return {
    code: course.code,
    name: course.name,
    department: course.department,
    sections_count: course.sections.length,
    is_new: isNew,
    diffs,
    sections,
  }
}

function detectDiffs(
  newCourse: CourseImportRow,
  oldCourse: ExistingCourse,
  sectionsByCourse: Map<number, ExistingSection[]>,
  sessionsBySection: Map<number, ExistingSession[]>
): string[] {
  const diffs: string[] = []
  if (newCourse.name !== oldCourse.name) {
    diffs.push(`Nombre: ${oldCourse.name.slice(0, 15)}... → ${newCourse.name.slice(0, 15)}...`)
  }
  if (newCourse.department !== oldCourse.department) {
    diffs.push(`Depto: ${oldCourse.department ?? ""} → ${newCourse.department}`)
  }

  const existingSections = sectionsByCourse.get(oldCourse.id) ?? []
  const oldByNumber = new Map(existingSections.map((s) => [s.section_number, s]))
  const newByNumber = new Map(newCourse.sections.map((s) => [s.section_number, s]))

  const oldNums = new Set(oldByNumber.keys())
  const newNums = new Set(newByNumber.keys())
  if (oldNums.size !== newNums.size || [...oldNums].some((n) => !newNums.has(n))) {
    const added = [...newNums].filter((n) => !oldNums.has(n)).sort()
    const removed = [...oldNums].filter((n) => !newNums.has(n)).sort()
    if (added.length) diffs.push(`+Secc: ${added.join(", ")}`)
    if (removed.length) diffs.push(`-Secc: ${removed.join(", ")}`)
  }

  for (const [num, oldSection] of oldByNumber) {
    const newSection = newByNumber.get(num)
    if (!newSection) continue

    if ((oldSection.professor ?? "") !== newSection.professor) {
      const oldP = (oldSection.professor || "TBD").split(",")[0]
      const newP = (newSection.professor || "TBD").split(",")[0]
      diffs.push(`Secc ${num} Prof: ${oldP} → ${newP}`)
    }
    if ((oldSection.capacity ?? 0) !== newSection.capacity) {
      diffs.push(`Secc ${num} Vac: ${oldSection.capacity ?? 0} → ${newSection.capacity}`)
    }

    const oldSessions = sessionsBySection.get(oldSection.id) ?? []
    const newSessions = newSection.sessions
    if (oldSessions.length !== newSessions.length) {
      diffs.push(`Secc ${num} Horarios: ${oldSessions.length} → ${newSessions.length} sess`)
    } else {
      const oldSigs = oldSessions
        .map((s) => `${DAY_ABBR[s.day] ?? s.day.slice(0, 2)} ${s.start_time.slice(0, 5)}`)
        .sort()
      const newSigs = newSessions
        .map((s) => `${DAY_ABBR[s.day] ?? s.day.slice(0, 2)} ${s.start_time.slice(0, 5)}`)
        .sort()
      if (oldSigs.join("|") !== newSigs.join("|")) {
        diffs.push(`Secc ${num}: Horarios cambian`)
      }
    }
  }

  return diffs
}

export interface ExistingCatalogData {
  courses: ExistingCourse[]
  sections: ExistingSection[]
  sessions: ExistingSession[]
}

export function buildAnalysis(mode: ImportMode, coursesData: CourseImportRow[], existing?: ExistingCatalogData): ImportAnalysis {
  const totalSections = coursesData.reduce((n, c) => n + c.sections.length, 0)
  const totalSessions = coursesData.reduce((n, c) => n + c.sections.reduce((m, s) => m + s.sessions.length, 0), 0)

  const departments: Record<string, number> = {}
  for (const c of coursesData) departments[c.department] = (departments[c.department] ?? 0) + 1

  const analysis: ImportAnalysis = {
    total_records_in_file: coursesData.length,
    unique_courses: coursesData.length,
    total_sections: totalSections,
    total_sessions: totalSessions,
    departments,
    mode,
    courses_preview: [],
  }

  if (mode === "update") {
    const existingCourses = existing?.courses ?? []
    const existingByCode = new Map(existingCourses.map((c) => [c.code, c]))

    const sectionsByCourse = new Map<number, ExistingSection[]>()
    for (const s of existing?.sections ?? []) {
      const list = sectionsByCourse.get(s.course_id) ?? []
      list.push(s)
      sectionsByCourse.set(s.course_id, list)
    }
    const sessionsBySection = new Map<number, ExistingSession[]>()
    for (const s of existing?.sessions ?? []) {
      const list = sessionsBySection.get(s.section_id) ?? []
      list.push(s)
      sessionsBySection.set(s.section_id, list)
    }

    const newCourses: CoursePreview[] = []
    const changedCourses: CoursePreview[] = []
    let unchanged = 0

    for (const newCourse of coursesData) {
      const oldCourse = existingByCode.get(newCourse.code)
      if (!oldCourse) {
        newCourses.push(toPreview(newCourse, true))
        continue
      }
      const diffs = detectDiffs(newCourse, oldCourse, sectionsByCourse, sessionsBySection)
      if (diffs.length) changedCourses.push(toPreview(newCourse, false, diffs))
      else unchanged++
    }

    const csvCodes = new Set(coursesData.map((c) => c.code))
    const notInFile = existingCourses.filter((c) => !csvCodes.has(c.code)).length

    analysis.existing_courses_count = existingCourses.length
    analysis.courses_to_add = newCourses.length
    analysis.courses_to_update = changedCourses.length
    analysis.unchanged_courses_count = unchanged
    analysis.courses_not_in_file = notInFile
    analysis.courses_preview = [...newCourses, ...changedCourses].slice(0, 50)
  } else {
    analysis.existing_courses_to_deactivate = existing?.courses.length ?? 0
    analysis.courses_preview = coursesData.slice(0, 50).map((c) => toPreview(c))
  }

  return analysis
}
