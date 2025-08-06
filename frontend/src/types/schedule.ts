import { Section, Session, CourseSection } from './academic';

// Schedule Generation Types
export interface ScheduleRequest {
  selected_sections: number[];
}

export interface ScheduleCombination {
  combination_id: number | string;
  sections: Section[];
  conflicts: ScheduleConflict[];
  // Also support the format expected by FavoriteSchedules component
  course_count?: number;
  courses?: CourseSection[];
}

export interface ScheduleResponse {
  combinations: ScheduleCombination[];
  total_combinations: number;
  message: string;
}

// Favorite Schedule Types
export interface FavoriteSchedule {
  id: string;
  name: string;
  combination: ScheduleCombination;
  created_at: string;
  notes?: string;
}

// UI State Types
export interface SelectedSection {
  sectionId: number;
  courseCode: string;
  courseName: string;
  sectionCode: string;
  professor: string;
  sessions: Session[];
}

export interface Filter {
  university: string;
  department: string;
  schedule: string;
  modality: string;
}

// Schedule Canvas Types
export interface ScheduleSlot {
  day: number;
  startTime: string;
  endTime: string;
  courseCode: string;
  sectionCode: string;
  classroom: string;
  professor: string;
  color: string;
}

// Conflict Types
export interface ScheduleConflict {
  type: 'time_overlap' | 'same_course' | 'capacity_full';
  message: string;
  sections: number[];
}

// Schedule Filters
export interface ScheduleFilters {
  department: string;
  semester?: string;
}

// Share Schedule Types
export interface ShareResponse {
  share_token: string;
}

export interface SharedScheduleData {
  schedule: FavoriteSchedule;
  shareCode: string;
  createdAt: string;
  permissions: 'view' | 'edit';
}

// Visualization Session Types (from schedules page)
export interface VisualizationSession {
  session_id: number;
  session_type: string;
  day: number;
  start_time: string;
  end_time: string;
  location: string;
  modality: string;
}

export interface VisualizationCourseSection {
  course_id: number;
  course_code: string;
  course_name: string;
  section_id: number;
  section_number: string;
  professor: string;
  sessions: VisualizationSession[];
}
