import { create } from 'zustand';
import {
  CurriculumTree,
  CourseProgressItem,
  ProgressSummary,
  CourseStatus,
} from '@/types/curriculum';
import { CurriculumAPI } from '@/services/curriculumAPI';

interface CurriculumState {
  curriculum: CurriculumTree | null;
  progressMap: Map<number, CourseProgressItem>;
  summary: ProgressSummary | null;
  unlockedIds: Set<number>;
  unlockedCourseDbIds: number[];
  isLoading: boolean;
  error: string | null;

  // Local overrides for optimistic updates
  localOverrides: Map<number, string>;

  // Actions
  fetchCurriculum: (curriculumId: number) => Promise<void>;
  fetchProgress: (curriculumId: number) => Promise<void>;
  toggleCourseStatus: (curriculumId: number, courseId: number) => void;
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

  fetchCurriculum: async (curriculumId: number) => {
    set({ isLoading: true, error: null });
    try {
      const tree = await CurriculumAPI.getCurriculumTree(curriculumId);
      set({ curriculum: tree, isLoading: false });
      // Also fetch progress
      await get().fetchProgress(curriculumId);
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

      set({
        progressMap,
        summary: data.summary,
        unlockedIds: new Set(unlocked.unlocked_curriculum_course_ids),
        unlockedCourseDbIds: unlocked.unlocked_course_ids,
        localOverrides: new Map(), // Clear overrides after fresh data
      });
    } catch {
      // Progress fetch failed — keep local state working
    }
  },

  toggleCourseStatus: (curriculumId: number, courseId: number) => {
    const currentStatus = get().getCourseStatus(courseId);
    let newStatus: string;
    if (currentStatus === 'completed') {
      newStatus = 'pending';
    } else if (currentStatus === 'unlocked' || currentStatus === 'pending') {
      newStatus = 'completed';
    } else {
      return; // Can't toggle locked courses
    }

    // Optimistic: update local overrides immediately
    const newOverrides = new Map(get().localOverrides);
    if (newStatus === 'pending') {
      newOverrides.delete(courseId); // Remove override to go back to computed state
    } else {
      newOverrides.set(courseId, newStatus);
    }
    set({ localOverrides: newOverrides });

    // Recompute unlocked based on new state
    get().recomputeLocalUnlocked();

    // Fire-and-forget API call, then refresh
    CurriculumAPI.updateCourseStatus(curriculumId, courseId, newStatus)
      .then(() => get().fetchProgress(curriculumId))
      .catch(() => {
        // API failed — local state stays as-is so user isn't confused
      });
  },

  // Recompute which courses are unlocked locally based on overrides
  recomputeLocalUnlocked: () => {
    // This is a lightweight local recompute for immediate visual feedback
    // The real unlocked computation happens server-side via fetchProgress
    const { curriculum, progressMap, localOverrides, unlockedIds } = get();
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

      // Courses with no prerequisites are unlocked by default
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
    const { progressMap, unlockedIds, curriculum, localOverrides } = get();

    // Check local overrides first (optimistic updates)
    const override = localOverrides.get(courseId);
    if (override === 'completed') return 'completed';
    if (override === 'in_progress') return 'in_progress';

    const progress = progressMap.get(courseId);
    if (progress?.status === 'completed') return 'completed';
    if (progress?.status === 'in_progress') return 'in_progress';

    const course = curriculum?.courses.find(c => c.id === courseId);
    if (course?.is_elective) return 'unlocked';

    if (unlockedIds.has(courseId)) return 'unlocked';
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
    });
  },
}));
