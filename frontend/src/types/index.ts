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
  credits: number;
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
  semester: string;
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
  student_id: string;
  university_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  university: University;
}

// Schedule Generation Types
export interface ScheduleRequest {
  selected_sections: number[];
  semester?: string;
}

export interface ScheduleCombination {
  combination_id: number;
  sections: Section[];
  total_credits: number;
  conflicts: unknown[];
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

// Search Types
export interface CourseSearchParams {
  q?: string;                    // Search query (renamed from query)
  university?: string;           // University short name (renamed from university_short_name)
  department?: string;
  semester?: string;             // Added semester parameter
  page?: number;                 // Page number (renamed from skip, starts at 1)
  size?: number;                 // Page size (renamed from limit)
}

export interface CourseSearchResponse {
  courses: Course[];
  total: number;
}

// UI State Types
export interface SelectedSection {
  sectionId: number;
  courseCode: string;
  courseName: string;
  sectionCode: string;
  professor: string;
  credits: number;
  sessions: Session[];
}

export interface Filter {
  university: string;
  department: string;
  semester: string;
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