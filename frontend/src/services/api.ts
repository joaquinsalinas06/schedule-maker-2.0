import { api } from './auth';
import { 
  CourseSearchParams, 
  Course,
  ScheduleRequest, 
  ScheduleResponse, 
  University 
} from '@/types';

export const apiService = {
  // Universities
  getUniversities: async (): Promise<University[]> => {
    const response = await api.get('/api/universities/');
    return response.data;
  },

  // Courses
  searchCourses: async (params: CourseSearchParams): Promise<Course[]> => {
    const queryParams = new URLSearchParams();
    
    if (params.q) queryParams.append('q', params.q);
    if (params.university) queryParams.append('university', params.university);
    if (params.department) queryParams.append('department', params.department);
    if (params.semester) queryParams.append('semester', params.semester);
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());

    const response = await api.get(`/api/courses/search?${queryParams.toString()}`);
    return response.data;
  },

  // Autocomplete courses - fast endpoint for typeahead
  autocompleteCourses: async (query: string, university?: string, limit: number = 10): Promise<Course[]> => {
    // Don't make request if query is too short
    if (!query || query.trim().length < 3) {
      return [];
    }

    const queryParams = new URLSearchParams();
    console.log('Autocomplete query:', query);
    console.log(queryParams.toString());
    queryParams.append('q', query.trim());
    if (university) queryParams.append('university', university);
    queryParams.append('limit', limit.toString());

    const response = await api.get(`/api/courses/autocomplete?${queryParams.toString()}`);
    return response.data;
  },

  getCourse: async (courseId: number) => {
    const response = await api.get(`/api/courses/${courseId}`);
    return response.data;
  },

  getDepartments: async (university?: string): Promise<string[]> => {
    const queryParams = new URLSearchParams();
    if (university) queryParams.append('university', university);
    
    const response = await api.get(`/api/courses/departments?${queryParams.toString()}`);
    return response.data;
  },

  // Schedule Generation
  generateSchedules: async (request: ScheduleRequest): Promise<any> => {
    const response = await api.post('/api/schedules/generate', request);
    console.log(response.data);
    return response.data;
  },

  // Get available courses for schedule generation
  getAvailableCourses: async (semester?: string): Promise<any[]> => {
    const queryParams = new URLSearchParams();
    if (semester) queryParams.append('semester', semester);
    
    const response = await api.get(`/api/schedules/courses?${queryParams.toString()}`);
    return response.data;
  },

  // Sections
  getSection: async (sectionId: number) => {
    const response = await api.get(`/api/sections/${sectionId}`);
    return response.data;
  }
};