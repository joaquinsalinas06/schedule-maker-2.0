export type ImportMode = "reset" | "update"

export interface SessionImportRow {
  session_type: string
  day: string
  start_time: string // "HH:MM"
  end_time: string // "HH:MM"
  location: string
  building: string
  room: string
  modality: string
  frequency: string
}

export interface SectionImportRow {
  section_number: string
  capacity: number
  enrolled: number
  professor: string
  professor_email: string
  sessions: SessionImportRow[]
}

export interface CourseImportRow {
  code: string
  name: string
  department: string
  sections: SectionImportRow[]
}

export interface SectionPreview {
  number: string
  professor: string
  capacity: number
  sessions: SessionImportRow[]
}

export interface CoursePreview {
  code: string
  name: string
  department: string
  sections_count: number
  is_new?: boolean
  diffs?: string[]
  sections: SectionPreview[]
}

export interface ImportAnalysis {
  total_records_in_file: number
  unique_courses: number
  total_sections: number
  total_sessions: number
  departments: Record<string, number>
  courses_preview: CoursePreview[]
  mode: ImportMode
  // update mode
  existing_courses_count?: number
  courses_to_add?: number
  courses_to_update?: number
  unchanged_courses_count?: number
  courses_not_in_file?: number
  // reset mode
  existing_courses_to_deactivate?: number
}

export interface ImportStats {
  mode: ImportMode
  errors: string[]
  courses_created?: number
  courses_updated?: number
  sections_created?: number
  sections_updated?: number
  sections_deactivated?: number
  sessions_created?: number
  sessions_updated?: number
  sessions_deactivated?: number
  [key: string]: unknown
}
