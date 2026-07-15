import { create } from 'zustand'
import type { CurriculumTree, CurriculumCourse, CourseProgressItem, ProgressSummary, CourseStatus } from '../types'
import * as curriculumData from '../data'
import { computeUnlocked, computeCourseStatus, computeSummary } from '../logic/prerequisites'
import { getCurrentPeriod as getCurrentPeriodPure, getPlannedCoursesForPeriod as getPlannedCoursesForPeriodPure } from '../logic/planning'

// --- Debounced sync: accumulates changes, bulk-sends after idle ---
let syncTimer: ReturnType<typeof setTimeout> | null = null
let pendingUpdates = new Map<number, string>() // courseId → status
let pendingPlans = new Map<number, string | null>() // courseId -> period
let pendingElectiveLinks = new Map<number, number | null>() // courseId -> linked_course_id
let pendingCurriculumId: number | null = null

function scheduleSyncToBackend(curriculumId: number) {
  pendingCurriculumId = curriculumId
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => flushToBackend(), 2000)
}

async function flushToBackend() {
  if (syncTimer) {
    clearTimeout(syncTimer)
    syncTimer = null
  }
  if ((pendingUpdates.size === 0 && pendingPlans.size === 0 && pendingElectiveLinks.size === 0) || !pendingCurriculumId) return

  const curriculumId = pendingCurriculumId
  const touchedIds = new Set<number>([...pendingUpdates.keys(), ...pendingPlans.keys(), ...pendingElectiveLinks.keys()])

  // Merge pending edits with current known state so every upserted row carries
  // a real value for status/planned_period/linked_course_override -- see the
  // comment on data.ts's ProgressUpsertRow for why partial rows are unsafe.
  const { progressMap, plannedPeriods, electiveLinks } = useCurriculumStore.getState()
  const rows = Array.from(touchedIds).map((id) => ({
    curriculum_course_id: id,
    status: pendingUpdates.get(id) ?? progressMap.get(id)?.status ?? 'pending',
    planned_period: pendingPlans.has(id) ? pendingPlans.get(id)! : plannedPeriods.get(id) ?? null,
    linked_course_override: pendingElectiveLinks.has(id) ? pendingElectiveLinks.get(id)! : electiveLinks.get(id)?.courseId ?? null,
  }))

  pendingUpdates = new Map()
  pendingPlans = new Map()
  pendingElectiveLinks = new Map()
  pendingCurriculumId = null

  try {
    await curriculumData.upsertProgress(curriculumId, rows)
    await useCurriculumStore.getState().fetchProgress(curriculumId)
  } catch {
    // Sync failed — local state stays as-is
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => flushToBackend())
}

// --- Store ---

interface CurriculumState {
  curriculum: CurriculumTree | null
  progressMap: Map<number, CourseProgressItem>
  summary: ProgressSummary | null
  unlockedIds: Set<number>
  unlockedCourseDbIds: number[]
  isLoading: boolean
  error: string | null

  localOverrides: Map<number, string>
  plannedPeriods: Map<number, string>
  electiveLinks: Map<number, { courseId: number; courseName: string }>

  // Actions
  fetchCurriculum: (curriculumId: number) => Promise<void>
  fetchProgress: (curriculumId: number) => Promise<void>
  fetchPlanningData: (curriculumId: number) => Promise<void>
  toggleCourseStatus: (curriculumId: number, courseId: number) => void
  setStatusFromPopover: (curriculumId: number, courseId: number, status: string) => void
  setPlan: (curriculumId: number, courseId: number, period: string | null) => void
  setElectiveLink: (curriculumId: number, curriculumCourseId: number, courseId: number, courseName: string) => void
  getPlannedCoursesForPeriod: (period: string) => CurriculumCourse[]
  getCurrentPeriod: () => string
  flushPendingSync: () => Promise<void>
  recomputeLocalUnlocked: () => void
  setCourseStatus: (curriculumId: number, courseId: number, status: string) => Promise<void>
  getCourseStatus: (courseId: number) => CourseStatus
  reset: () => void
}

export const useCurriculumStore = create<CurriculumState>((set, get) => ({
  curriculum: null,
  progressMap: new Map(),
  summary: null,
  unlockedIds: new Set(),
  unlockedCourseDbIds: [],
  isLoading: false,
  error: null,
  localOverrides: new Map(),
  plannedPeriods: new Map(),
  electiveLinks: new Map(),

  fetchCurriculum: async (curriculumId: number) => {
    set({ isLoading: true, error: null })
    try {
      const tree = await curriculumData.getCurriculumTree(curriculumId)
      set({ curriculum: tree, plannedPeriods: new Map(), electiveLinks: new Map() })
      get().recomputeLocalUnlocked()

      // Await progress and planning data before hiding the loading state
      await Promise.all([get().fetchProgress(curriculumId), get().fetchPlanningData(curriculumId)])

      set({ isLoading: false })
    } catch (err: any) {
      set({ error: err.message || 'Error loading curriculum', isLoading: false })
    }
  },

  fetchProgress: async (curriculumId: number) => {
    try {
      const { curriculum } = get()
      const rows = await curriculumData.getUserProgress(curriculumId)
      const progressMap = new Map<number, CourseProgressItem>()
      for (const r of rows) {
        progressMap.set(r.curriculum_course_id, { curriculum_course_id: r.curriculum_course_id, status: r.status, completed_at: r.completed_at })
      }

      const currentOverrides = get().localOverrides
      const reconciledOverrides = new Map<number, string>()
      for (const [courseId, overrideStatus] of currentOverrides) {
        const serverProgress = progressMap.get(courseId)
        if (serverProgress?.status !== overrideStatus) {
          reconciledOverrides.set(courseId, overrideStatus)
        }
      }

      let unlockedIds = get().unlockedIds
      let unlockedCourseDbIds = get().unlockedCourseDbIds
      let summary: ProgressSummary | null = null

      if (curriculum) {
        const getStatus = (courseId: number) => (progressMap.get(courseId)?.status ?? 'pending') as 'completed' | 'in_progress' | 'pending'
        const unlocked = computeUnlocked(curriculum.courses, getStatus)
        unlockedIds = unlocked.unlockedIds
        unlockedCourseDbIds = curriculum.courses
          .filter((c) => unlockedIds.has(c.id) && c.linked_course_id !== null)
          .map((c) => c.linked_course_id as number)
        summary = computeSummary(curriculum.courses, getStatus, curriculum.total_credits, unlockedIds.size)
      }

      set({
        progressMap,
        summary,
        unlockedIds,
        unlockedCourseDbIds,
        localOverrides: reconciledOverrides,
      })
    } catch {
      get().recomputeLocalUnlocked()
    }
  },

  fetchPlanningData: async (curriculumId: number) => {
    try {
      const rows = await curriculumData.getUserProgress(curriculumId)

      const plannedPeriods = new Map<number, string>()
      const mergedLinks = new Map(get().electiveLinks)
      for (const row of rows) {
        if (row.planned_period) plannedPeriods.set(row.curriculum_course_id, row.planned_period)
        if (row.linked_course_override !== null) {
          const existing = mergedLinks.get(row.curriculum_course_id)
          if (!existing || existing.courseId !== row.linked_course_override) {
            mergedLinks.set(row.curriculum_course_id, {
              courseId: row.linked_course_override,
              courseName: row.linked_course_name || existing?.courseName || `Course #${row.linked_course_override}`,
            })
          }
        }
      }

      set({ plannedPeriods, electiveLinks: mergedLinks })
    } catch (err) {
      // Keep local plans if fetch fails
      console.error('Failed to fetch planning data:', err)
    }
  },

  toggleCourseStatus: (curriculumId: number, courseId: number) => {
    const currentStatus = get().getCourseStatus(courseId)
    let newStatus: string
    if (currentStatus === 'completed') {
      newStatus = 'pending'
    } else if (currentStatus === 'unlocked' || currentStatus === 'pending' || currentStatus === 'planned') {
      newStatus = 'completed'
    } else {
      return
    }

    const newOverrides = new Map(get().localOverrides)
    if (newStatus === 'pending') {
      newOverrides.delete(courseId)
    } else {
      newOverrides.set(courseId, newStatus)
    }
    set({ localOverrides: newOverrides })
    get().recomputeLocalUnlocked()

    pendingUpdates.set(courseId, newStatus === 'pending' ? 'pending' : newStatus)
    scheduleSyncToBackend(curriculumId)
  },

  setStatusFromPopover: (curriculumId: number, courseId: number, status: string) => {
    const newOverrides = new Map(get().localOverrides)
    if (status === 'pending') {
      newOverrides.delete(courseId)
    } else {
      newOverrides.set(courseId, status)
    }
    set({ localOverrides: newOverrides })
    get().recomputeLocalUnlocked()

    pendingUpdates.set(courseId, status)
    scheduleSyncToBackend(curriculumId)
  },

  setPlan: (curriculumId: number, courseId: number, period: string | null) => {
    const newPlans = new Map(get().plannedPeriods)
    if (period) {
      newPlans.set(courseId, period)
    } else {
      newPlans.delete(courseId)
    }
    set({ plannedPeriods: newPlans })

    pendingPlans.set(courseId, period)
    scheduleSyncToBackend(curriculumId)
  },

  setElectiveLink: (curriculumId: number, curriculumCourseId: number, courseId: number, courseName: string) => {
    const newLinks = new Map(get().electiveLinks)
    newLinks.set(curriculumCourseId, { courseId, courseName })
    set({ electiveLinks: newLinks })

    pendingElectiveLinks.set(curriculumCourseId, courseId)
    scheduleSyncToBackend(curriculumId)
  },

  getPlannedCoursesForPeriod: (period: string): CurriculumCourse[] => {
    const { curriculum, plannedPeriods, electiveLinks } = get()
    if (!curriculum) return []
    return getPlannedCoursesForPeriodPure(curriculum.courses, plannedPeriods, electiveLinks, period)
  },

  getCurrentPeriod: () => getCurrentPeriodPure(),

  flushPendingSync: async () => {
    await flushToBackend()
  },

  recomputeLocalUnlocked: () => {
    const { curriculum, progressMap, localOverrides } = get()
    if (!curriculum) return

    const getStatus = (courseId: number): 'completed' | 'in_progress' | 'pending' => {
      const override = localOverrides.get(courseId)
      if (override === 'completed') return 'completed'
      if (override && override !== 'pending') return 'in_progress'
      return (progressMap.get(courseId)?.status ?? 'pending') as 'completed' | 'in_progress' | 'pending'
    }

    const { unlockedIds } = computeUnlocked(curriculum.courses, getStatus)
    set({ unlockedIds })
  },

  setCourseStatus: async (curriculumId: number, courseId: number, status: string) => {
    try {
      const { plannedPeriods, electiveLinks } = get()
      await curriculumData.upsertProgress(curriculumId, [
        {
          curriculum_course_id: courseId,
          status,
          planned_period: plannedPeriods.get(courseId) ?? null,
          linked_course_override: electiveLinks.get(courseId)?.courseId ?? null,
        },
      ])
      await get().fetchProgress(curriculumId)
    } catch (err: any) {
      set({ error: err.message || 'Error updating status' })
    }
  },

  getCourseStatus: (courseId: number): CourseStatus => {
    const { progressMap, unlockedIds, curriculum, localOverrides, plannedPeriods } = get()
    const course = curriculum?.courses.find((c) => c.id === courseId)

    return computeCourseStatus({
      courseId,
      serverStatus: progressMap.get(courseId)?.status,
      localOverride: localOverrides.get(courseId),
      isElective: course?.is_elective ?? false,
      isUnlocked: unlockedIds.has(courseId),
      hasPlannedPeriod: plannedPeriods.has(courseId),
    })
  },

  reset: () => {
    set({
      curriculum: null,
      progressMap: new Map(),
      summary: null,
      unlockedIds: new Set(),
      unlockedCourseDbIds: [],
      isLoading: false,
      error: null,
      localOverrides: new Map(),
      plannedPeriods: new Map(),
    })
  },
}))
