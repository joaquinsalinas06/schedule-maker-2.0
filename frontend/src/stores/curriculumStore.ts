import { create } from 'zustand';
import {
  CurriculumTree,
  CurriculumCourse,
  CourseProgressItem,
  ProgressSummary,
  CourseStatus,
} from '@/types/curriculum';
import { CurriculumAPI } from '@/services/curriculumAPI';

// --- Debounced sync: accumulates changes, bulk-sends after idle ---
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let pendingUpdates = new Map<number, string>(); // courseId → status
let pendingPlans = new Map<number, string | null>(); // courseId -> period
let pendingElectiveLinks = new Map<number, number | null>(); // courseId -> linked_course_id
let pendingCurriculumId: number | null = null;

function scheduleSyncToBackend(curriculumId: number) {
  pendingCurriculumId = curriculumId;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => flushToBackend(), 2000);
}

async function flushToBackend() {
  if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
  if ((pendingUpdates.size === 0 && pendingPlans.size === 0 && pendingElectiveLinks.size === 0) || !pendingCurriculumId) return;

  const curriculumId = pendingCurriculumId;
  
  const statusUpdates = Array.from(pendingUpdates.entries()).map(([id, status]) => ({
    curriculum_course_id: id,
    status,
  }));
  
  const planUpdates = Array.from(pendingPlans.entries()).map(([id, period]) => ({
    curriculum_course_id: id,
    planned_period: period,
  }));

  const linkUpdates = Array.from(pendingElectiveLinks.entries()).map(([id, linkedId]) => ({
    curriculum_course_id: id,
    linked_course_id: linkedId,
  }));

  pendingUpdates = new Map();
  pendingPlans = new Map();
  pendingElectiveLinks = new Map();
  pendingCurriculumId = null;

  try {
    if (statusUpdates.length > 0) {
      await CurriculumAPI.bulkUpdateStatus(curriculumId, statusUpdates);
    }
    if (planUpdates.length > 0 || linkUpdates.length > 0) {
      await CurriculumAPI.updatePlanningData(curriculumId, planUpdates, linkUpdates);
    }
    const store = useCurriculumStore.getState();
    await store.fetchProgress(curriculumId);
  } catch {
    // Sync failed — local state stays as-is
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => flushToBackend());
}



function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const semester = now.getMonth() < 6 ? 1 : 2;
  return `${year}-${semester}`;
}

// --- Store ---

interface CurriculumState {
  curriculum: CurriculumTree | null;
  progressMap: Map<number, CourseProgressItem>;
  summary: ProgressSummary | null;
  unlockedIds: Set<number>;
  unlockedCourseDbIds: number[];
  isLoading: boolean;
  error: string | null;

  localOverrides: Map<number, string>;
  plannedPeriods: Map<number, string>;
  electiveLinks: Map<number, { courseId: number, courseName: string }>;

  // Actions
  fetchCurriculum: (curriculumId: number) => Promise<void>;
  fetchProgress: (curriculumId: number) => Promise<void>;
  fetchPlanningData: (curriculumId: number) => Promise<void>;
  toggleCourseStatus: (curriculumId: number, courseId: number) => void;
  setStatusFromPopover: (curriculumId: number, courseId: number, status: string) => void;
  setPlan: (curriculumId: number, courseId: number, period: string | null) => void;
  setElectiveLink: (curriculumId: number, curriculumCourseId: number, courseId: number, courseName: string) => void;
  getPlannedCoursesForPeriod: (period: string) => CurriculumCourse[];
  getCurrentPeriod: () => string;
  flushPendingSync: () => Promise<void>;
  recomputeLocalUnlocked: () => void;
  setCourseStatus: (curriculumId: number, courseId: number, status: string) => Promise<void>;
  getCourseStatus: (courseId: number) => CourseStatus;
  reset: () => void;
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
    set({ isLoading: true, error: null });
    try {
      const tree = await CurriculumAPI.getCurriculumTree(curriculumId);
      set({ curriculum: tree, plannedPeriods: new Map(), electiveLinks: new Map() });
      get().recomputeLocalUnlocked();
      
      // Await progress and planning data before hiding the loading state
      await Promise.all([
        get().fetchProgress(curriculumId),
        get().fetchPlanningData(curriculumId)
      ]);
      
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Error loading curriculum', isLoading: false });
    }
  },

  fetchProgress: async (curriculumId: number) => {
    try {
      const data = await CurriculumAPI.getProgress(curriculumId);
      const progressMap = new Map<number, CourseProgressItem>();
      for (const p of data.progress) {
        progressMap.set(p.curriculum_course_id, p);
      }
      
      const unlocked = await CurriculumAPI.getUnlockedCourses(curriculumId);

      const currentOverrides = get().localOverrides;
      const reconciledOverrides = new Map<number, string>();
      for (const [courseId, overrideStatus] of currentOverrides) {
        const serverProgress = progressMap.get(courseId);
        if (serverProgress?.status !== overrideStatus) {
          reconciledOverrides.set(courseId, overrideStatus);
        }
      }

      set({
        progressMap,
        summary: data.summary,
        unlockedIds: new Set(unlocked.unlocked_curriculum_course_ids),
        unlockedCourseDbIds: unlocked.unlocked_course_ids,
        localOverrides: reconciledOverrides,
      });
    } catch {
      get().recomputeLocalUnlocked();
    }
  },

  fetchPlanningData: async (curriculumId: number) => {
    try {
      const data = await CurriculumAPI.getPlanningData(curriculumId);
      
      const plannedPeriods = new Map<number, string>();
      for (const [id, period] of Object.entries(data.planned_periods)) {
        plannedPeriods.set(Number(id), period);
      }
      
      const currentLinks = get().electiveLinks;
      const mergedLinks = new Map(currentLinks);
      // Backend overrides local if missing, but we keep local course names since backend only sends IDs
      for (const [idStr, linkedId] of Object.entries(data.elective_links)) {
        const id = Number(idStr);
        const existing = mergedLinks.get(id);
        if (!existing || existing.courseId !== linkedId) {
           mergedLinks.set(id, { courseId: linkedId, courseName: existing?.courseName || `Course #${linkedId}` });
        }
      }

      set({ plannedPeriods, electiveLinks: mergedLinks });
    } catch (err) {
      // Keep local plans if fetch fails
      console.error('Failed to fetch planning data:', err);
    }
  },


  toggleCourseStatus: (curriculumId: number, courseId: number) => {
    const currentStatus = get().getCourseStatus(courseId);
    let newStatus: string;
    if (currentStatus === 'completed') {
      newStatus = 'pending';
    } else if (currentStatus === 'unlocked' || currentStatus === 'pending' || currentStatus === 'planned') {
      newStatus = 'completed';
    } else {
      return;
    }

    const newOverrides = new Map(get().localOverrides);
    if (newStatus === 'pending') {
      newOverrides.delete(courseId);
    } else {
      newOverrides.set(courseId, newStatus);
    }
    set({ localOverrides: newOverrides });
    get().recomputeLocalUnlocked();

    pendingUpdates.set(courseId, newStatus === 'pending' ? 'pending' : newStatus);
    scheduleSyncToBackend(curriculumId);
  },

  setStatusFromPopover: (curriculumId: number, courseId: number, status: string) => {
    const newOverrides = new Map(get().localOverrides);
    if (status === 'pending') {
      newOverrides.delete(courseId);
    } else {
      newOverrides.set(courseId, status);
    }
    set({ localOverrides: newOverrides });
    get().recomputeLocalUnlocked();

    pendingUpdates.set(courseId, status);
    scheduleSyncToBackend(curriculumId);
  },

  setPlan: (curriculumId: number, courseId: number, period: string | null) => {
    const newPlans = new Map(get().plannedPeriods);
    if (period) {
      newPlans.set(courseId, period);
    } else {
      newPlans.delete(courseId);
    }
    set({ plannedPeriods: newPlans });
    
    pendingPlans.set(courseId, period);
    scheduleSyncToBackend(curriculumId);
  },

  setElectiveLink: (curriculumId: number, curriculumCourseId: number, courseId: number, courseName: string) => {
    const newLinks = new Map(get().electiveLinks);
    newLinks.set(curriculumCourseId, { courseId, courseName });
    set({ electiveLinks: newLinks });
    
    pendingElectiveLinks.set(curriculumCourseId, courseId);
    scheduleSyncToBackend(curriculumId);
  },

  getPlannedCoursesForPeriod: (period: string): CurriculumCourse[] => {
    const { curriculum, plannedPeriods, electiveLinks } = get();
    if (!curriculum) return [];
    return curriculum.courses
      .filter(c => plannedPeriods.get(c.id) === period)
      .map(c => {
        const link = electiveLinks.get(c.id);
        if (link) {
          return { ...c, linked_course_id: link.courseId, course_name: link.courseName };
        }
        return c;
      });
  },

  getCurrentPeriod: () => getCurrentPeriod(),

  flushPendingSync: async () => {
    await flushToBackend();
  },

  recomputeLocalUnlocked: () => {
    const { curriculum, progressMap, localOverrides } = get();
    if (!curriculum) return;

    const completedIds = new Set<number>();
    let totalCredits = 0;

    for (const course of curriculum.courses) {
      const override = localOverrides.get(course.id);
      const progress = progressMap.get(course.id);
      const isCompleted = override === 'completed' || (!override && progress?.status === 'completed');
      if (isCompleted) {
        completedIds.add(course.id);
        totalCredits += course.credits;
      }
    }

    const newUnlocked = new Set<number>();
    for (const course of curriculum.courses) {
      if (completedIds.has(course.id)) continue;
      if (course.is_elective) {
        newUnlocked.add(course.id);
        continue;
      }

      const allPrereqsMet = course.prerequisites.every((prereq) => {
        if (prereq.prerequisite_type === 'credits') {
          return totalCredits >= (prereq.required_credits || 0);
        }
        if (prereq.prerequisite_type === 'course' && prereq.prerequisite_course_id) {
          return completedIds.has(prereq.prerequisite_course_id);
        }
        return true;
      });

      if (course.prerequisites.length === 0 || allPrereqsMet) {
        newUnlocked.add(course.id);
      }
    }

    set({ unlockedIds: newUnlocked });
  },

  setCourseStatus: async (curriculumId: number, courseId: number, status: string) => {
    try {
      await CurriculumAPI.updateCourseStatus(curriculumId, courseId, status);
      await get().fetchProgress(curriculumId);
    } catch (err: any) {
      set({ error: err.message || 'Error updating status' });
    }
  },

  getCourseStatus: (courseId: number): CourseStatus => {
    const { progressMap, unlockedIds, curriculum, localOverrides, plannedPeriods } = get();

    const override = localOverrides.get(courseId);
    if (override === 'completed') return 'completed';
    if (override === 'in_progress') return 'in_progress';

    const progress = progressMap.get(courseId);
    if (progress?.status === 'completed') return 'completed';
    if (progress?.status === 'in_progress') return 'in_progress';

    const course = curriculum?.courses.find(c => c.id === courseId);
    const isUnlocked = course?.is_elective || unlockedIds.has(courseId);

    // If unlocked and has a planned period, show as "planned"
    if (isUnlocked && plannedPeriods.has(courseId)) return 'planned';
    if (isUnlocked) return 'unlocked';
    return 'locked';
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
    });
  },
}));
