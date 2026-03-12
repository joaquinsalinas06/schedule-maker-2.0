// Curriculum Types

export interface CurriculumPrerequisite {
  id: number;
  prerequisite_course_id: number | null;
  prerequisite_type: "course" | "credits";
  required_credits: number | null;
  prerequisite_course_name: string | null;
}

export interface CurriculumCourse {
  id: number;
  course_name: string;
  semester: number;
  credits: number;
  is_elective: boolean;
  elective_group: string | null;
  linked_course_id: number | null;
  prerequisites: CurriculumPrerequisite[];
}

export interface CurriculumTree {
  id: number;
  name: string;
  code: string;
  year: number;
  total_credits: number;
  total_semesters: number;
  courses: CurriculumCourse[];
}

export interface CurriculumListItem {
  id: number;
  name: string;
  code: string;
  year: number;
  total_credits: number;
  total_semesters: number;
}

export interface CourseProgressItem {
  curriculum_course_id: number;
  status: "completed" | "in_progress" | "pending";
  completed_at: string | null;
}

export interface ProgressSummary {
  completed: number;
  in_progress: number;
  total: number;
  credits_earned: number;
  credits_total: number;
  percentage: number;
  unlocked_count: number;
}

export interface CurriculumProgress {
  curriculum_id: number;
  progress: CourseProgressItem[];
  summary: ProgressSummary;
}

export interface UnlockedCourses {
  unlocked_curriculum_course_ids: number[];
  unlocked_course_ids: number[];
}

export type CourseStatus = "completed" | "in_progress" | "pending" | "locked" | "unlocked" | "planned";
