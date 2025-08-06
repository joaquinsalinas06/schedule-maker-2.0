import axios from 'axios';
import { 
  CollaborativeSession, 
  ScheduleShare, 
  ScheduleComparison,
  CreateSessionRequest,
  JoinSessionRequest,
  ShareScheduleRequest,
  AddComparisonRequest,
  CourseSelection,
  CourseSelectionCreate,
  GenerateSchedulesRequest
} from '@/types/collaboration';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

// Create axios instance with auth
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export class CollaborationAPI {
  // Collaborative Sessions
  static async createSession(data: CreateSessionRequest): Promise<CollaborativeSession> {
    const response = await apiClient.post('/collaboration/sessions', data);
    return response.data;
  }

  static async joinSession(data: JoinSessionRequest): Promise<CollaborativeSession> {
    const response = await apiClient.post('/collaboration/sessions/join', data);
    return response.data;
  }

  static async getSession(sessionCode: string): Promise<CollaborativeSession> {
    const response = await apiClient.get(`/collaboration/sessions/${sessionCode}`);
    return response.data;
  }

  static async getUserSessions(): Promise<CollaborativeSession[]> {
    const response = await apiClient.get('/collaboration/sessions');
    return response.data;
  }

  // Schedule Sharing
  static async shareSchedule(data: ShareScheduleRequest): Promise<ScheduleShare> {
    const response = await apiClient.post('/collaboration/share', data);
    return response.data;
  }

  static async getSharedSchedule(shareToken: string): Promise<{
    schedule: any;
    permissions: string;
    shared_by: any;
  }> {
    const response = await apiClient.get(`/collaboration/shared/${shareToken}`);
    return response.data;
  }

  static async getSharedSchedules(): Promise<ScheduleShare[]> {
    const response = await apiClient.get('/collaboration/shared');
    return response.data;
  }

  static async revokeScheduleShare(shareId: number): Promise<void> {
    await apiClient.delete(`/collaboration/shared/${shareId}`);
  }

  static async saveSchedule(scheduleData: any): Promise<any> {
    // Convert the schedule data to the format expected by the backend
    const payload = {
      combination_id: scheduleData.combination?.combination_id || `temp_${Date.now()}`,
      name: scheduleData.name,
      description: scheduleData.description || '',
      // Include the actual course data so backend can store sessions
      combination: scheduleData.combination
    };
    
    
    const response = await apiClient.post('/api/schedules/save', payload);
    return response.data;
  }

  // Schedule Comparison
  static async addScheduleToComparison(
    sessionId: number, 
    data: AddComparisonRequest
  ): Promise<ScheduleComparison> {
    const response = await apiClient.post(
      `/collaboration/sessions/${sessionId}/compare`, 
      data
    );
    return response.data;
  }

  static async getSessionComparisons(sessionId: number): Promise<ScheduleComparison[]> {
    const response = await apiClient.get(`/collaboration/sessions/${sessionId}/compare`);
    return response.data;
  }

  // Course Selections
  static async getCourseSelections(sessionId: number): Promise<CourseSelection[]> {
    const response = await apiClient.get(`/collaboration/sessions/${sessionId}/courses`);
    return response.data;
  }

  static async saveCourseSelection(sessionId: number, selection: CourseSelectionCreate): Promise<CourseSelection> {
    const response = await apiClient.post(`/collaboration/sessions/${sessionId}/courses`, selection);
    return response.data;
  }

  static async removeCourseSelection(sessionId: number, selectionId: number): Promise<void> {
    await apiClient.delete(`/collaboration/sessions/${sessionId}/courses/${selectionId}`);
  }

  static async updateCourseSelection(
    sessionId: number, 
    selectionId: number, 
    updateData: {
      selection_type?: 'shared' | 'individual';
      shared_with_users?: number[];
      priority?: number;
    }
  ): Promise<CourseSelection> {
    const response = await apiClient.put(`/collaboration/sessions/${sessionId}/courses/${selectionId}`, updateData);
    return response.data;
  }

  // Schedule Generation
  static async generateSchedules(data: GenerateSchedulesRequest): Promise<any> {
    const response = await apiClient.post('/collaboration/generate-schedules', data);
    return response.data;
  }

}

// Hook for easier usage with React Query
export const useCollaborationQueries = () => {
  return {
    // Add React Query hooks here if needed
  };
};
