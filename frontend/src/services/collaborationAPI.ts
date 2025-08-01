import axios from 'axios';
import { CollaborativeSession, ScheduleShare, ScheduleComparison } from '../stores/collaborationStore';

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

export interface CreateSessionRequest {
  name: string;
  description?: string;
  max_participants?: number;
  duration_hours?: number;
}

export interface JoinSessionRequest {
  session_code: string;
}

export interface ShareScheduleRequest {
  schedule_id: number;
  shared_with?: number;
  permissions?: string;
  expires_hours?: number;
}

export interface AddComparisonRequest {
  schedule_id: number;
}

export interface CommentRequest {
  comment: string;
  parent_comment_id?: number;
}

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
      semester: scheduleData.semester || 'ciclo-1',
      // Include the actual course data so backend can store sessions
      combination: scheduleData.combination
    };
    
    console.log('=== SAVE SCHEDULE PAYLOAD ===');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('============================');
    
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

  // Schedule Comments
  static async addComment(scheduleId: number, data: CommentRequest): Promise<any> {
    const response = await apiClient.post(
      `/collaboration/schedules/${scheduleId}/comments`, 
      data
    );
    return response.data;
  }

  static async getComments(scheduleId: number): Promise<any[]> {
    const response = await apiClient.get(`/collaboration/schedules/${scheduleId}/comments`);
    return response.data;
  }
}

// Hook for easier usage with React Query
export const useCollaborationQueries = () => {
  return {
    // Add React Query hooks here if needed
  };
};
