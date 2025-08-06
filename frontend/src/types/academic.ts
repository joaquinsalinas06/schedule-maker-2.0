// Core University and Academic Types
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
