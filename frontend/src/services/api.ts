import { api } from './auth';
import { 
  Course,
  ScheduleRequest
} from '@/types';

export const apiService = {
  // Courses

    // Search courses with enhanced filters (replaces autocomplete)
  searchCourses: async (
    query?: string, 
    university?: string, 
    department?: string, 
    professor?: string, 
    limit: number = 20
  ): Promise<Course[]> => {
    const queryParams = new URLSearchParams();
    
    if (query && query.trim().length > 0) queryParams.append('q', query.trim());
    if (university) queryParams.append('university', university);
    if (department) queryParams.append('department', department);
    if (professor) queryParams.append('professor', professor);
    queryParams.append('limit', limit.toString());

    const response = await api.get(`/api/courses/search?${queryParams.toString()}`);
    return response.data;
  },

  // Carga Habil
  parseCargaHabil: async (file: File): Promise<{
    mandatory: { code: string; name: string; type: string }[];
    electives: { code: string; name: string; type: string }[];
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/courses/parse-carga-habil', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getBulkCourseDetails: async (courseCodes: string[], universityId: number = 1): Promise<Course[]> => {
    const response = await api.post('/api/courses/bulk-details', {
      course_codes: courseCodes,
      university_id: universityId
    });
    return response.data;
  },

  getBulkCoursesByIds: async (courseIds: number[], courseNames?: string[]): Promise<Course[]> => {
    const response = await api.post('/api/courses/bulk-by-ids', {
      course_ids: courseIds,
      course_names: courseNames
    });
    return response.data;
  },
  // Schedule Generation
  generateSchedules: async (request: ScheduleRequest): Promise<any> => {
    const response = await api.post('/api/schedules/generate', request);

    return response.data;
  },

};