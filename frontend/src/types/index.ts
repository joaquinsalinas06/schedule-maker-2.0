// API Response Types
export interface University {
  id: number;
  name: string;
  short_name: string;
  country: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: number;
  code: string;
  name: string;
  university_id: number;
  department: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  university: University;
  sections: Section[];
}

export interface Section {
  id: number;
  section_number: string;
  course_id: number;
  professor: string;
  capacity: number;
  enrolled: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  course: Course;
  sessions: Session[];
}

export interface Session {
  id: number;
  section_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  classroom: string;
  session_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  nickname?: string;
  profile_photo?: string;
  description?: string;
  student_id: string;
  university_id: number;
  role: string;
  is_verified: boolean;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  university: University;
}

export interface UserProfileUpdate {
  first_name?: string;
  last_name?: string;
  nickname?: string;
  profile_photo?: string;
  description?: string;
  student_id?: string;
}

// Schedule Generation Types
export interface ScheduleRequest {
  selected_sections: number[];
}

// Course Section for schedule combinations
export interface CourseSection {
  course_id: number;
  course_code: string;
  course_name: string;
  section_id: number;
  section_number: string;
  professor: string;
  sessions: Session[];
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

// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  university_id: number;
  student_id: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
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

// Dashboard Specific Types
export interface SectionPopupState {
  courseId: number;
  course: Course;
}

export interface GroupedCourse {
  courseName: string;
  courseCode: string;
  sections: Array<SelectedSection & { index: number }>;
}

export interface ScheduleFilters {
  department: string;
  semester?: string;
}

export interface SidebarSection {
  id: string;
  title: string;
  shortTitle: string;
  icon: any; // Lucide icon component
  color: string;
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

// Schedule Comparison Types
export interface ComparisonParticipant {
  id: string;
  name: string;
  color: string;
  schedules: ScheduleCombination[];
  isVisible: boolean;
}

export interface ComparisonConflict {
  type: 'time_overlap';
  participants: string[]; // participant IDs
  timeSlot: {
    day: string | number;
    startTime: string;
    endTime: string;
  };
  affectedSessions: Array<{
    participantId: string;
    scheduleId: string;
    sessionId: number;
    courseCode: string;
    courseName: string;
  }>;
}

export interface ScheduleComparison {
  id: string;
  name: string;
  participants: ComparisonParticipant[];
  selectedCombinations: Array<{
    participantId: string;
    combinationId: string;
  }>;
  conflicts: ComparisonConflict[];
  createdAt: string;
  updatedAt: string;
}

export interface ComparisonVisualizationProps {
  comparison: ScheduleComparison;
  onParticipantToggle?: (participantId: string) => void;
  onCombinationChange?: (participantId: string, combinationId: string) => void;
  onConflictHighlight?: (conflict: ComparisonConflict) => void;
}