export { useCurriculumStore } from './hooks/curriculumStore'
export { default as CurriculumGraph } from './components/CurriculumGraph'
export { default as ProgressSummaryCard } from './components/ProgressSummaryCard'

export { listCurricula, getUserCurriculumId, setUserCurriculum } from './data'

export type {
  CurriculumListItem,
  CurriculumTree,
  CurriculumCourse,
  CurriculumPrerequisite,
  CourseProgressItem,
  ProgressSummary,
  CourseStatus,
} from './types'

// Exported for the generate/schedule pages (owned by a different agent):
// `unlockedCourseDbIds` on the store is the list of catalog `courses.id`
// unlocked by the user's curriculum progress -- already filtered to non-null
// linked_course_id -- for filtering course search results. `getPlannedCoursesForPeriod`
// + `getCurrentPeriod` back the "planned courses this period" banner. Pull
// these off `useCurriculumStore()`; no separate API needed.
