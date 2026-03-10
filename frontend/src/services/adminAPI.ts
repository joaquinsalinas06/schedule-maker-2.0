import { api } from './auth';

export interface SessionPreview {
  type: string;
  day: string;
  start_time: string;
  end_time: string;
  location: string;
  modality: string;
}

export interface SectionPreview {
  number: string;
  professor: string;
  capacity: number;
  enrolled: number;
  sessions: SessionPreview[];
}

export interface CoursePreview {
  code: string;
  name: string;
  department: string;
  sections_count: number;
  sessions_count: number;
  sections: SectionPreview[];
}

export interface ImportAnalysis {
  total_records_in_file: number;
  unique_courses: number;
  total_sections: number;
  total_sessions: number;
  departments: Record<string, number>;
  courses_preview: CoursePreview[];
  mode: string;
  // Update mode fields
  existing_courses_count?: number;
  courses_to_add?: number;
  courses_to_update?: number;
  courses_not_in_file?: number;
  // Reset mode fields
  existing_courses_to_deactivate?: number;
}

export interface ImportStats {
  mode: string;
  errors: string[];
  [key: string]: unknown;
}

export interface AuditLogEntry {
  id: number;
  action: string;
  file_name: string | null;
  status: string;
  details: Record<string, unknown> | null;
  executed_at: string | null;
}

export const adminAPI = {
  checkAdminStatus: async (): Promise<{ is_admin: boolean; user_id: number; email: string }> => {
    const response = await api.get('/api/admin/status');
    return response.data;
  },

  analyzeImport: async (
    file: File,
    mode: 'reset' | 'update',
    universityId: number = 1
  ): Promise<{ success: boolean; analysis: ImportAnalysis }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(
      `/api/admin/import/analyze?mode=${mode}&university_id=${universityId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  executeImport: async (
    file: File,
    mode: 'reset' | 'update',
    universityId: number = 1
  ): Promise<{ success: boolean; message: string; stats: ImportStats }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(
      `/api/admin/import/execute?mode=${mode}&university_id=${universityId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 600000 }
    );
    return response.data;
  },

  getImportHistory: async (limit: number = 20): Promise<AuditLogEntry[]> => {
    const response = await api.get(`/api/admin/import/history?limit=${limit}`);
    return response.data;
  },
};
