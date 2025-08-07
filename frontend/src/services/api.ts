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


  // Schedule Generation
  generateSchedules: async (request: ScheduleRequest): Promise<any> => {
    const response = await api.post('/api/schedules/generate', request);

    return response.data;
  },

};