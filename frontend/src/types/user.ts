import { University } from './academic';

// User Types
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
  friendship_status?: string;
  stats?: {
    friend_count: number;
    schedules_count: number;
  };
}

export interface UserProfileUpdate {
  first_name?: string;
  last_name?: string;
  nickname?: string;
  profile_photo?: string;
  description?: string;
  student_id?: string;
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

// Friend Types
export interface FriendRequest {
  id: number;
  sender?: User;
  receiver?: User;
  message?: string;
  created_at: string;
}

export interface FriendRequestsResponse {
  received: FriendRequest[];
  sent: FriendRequest[];
}

// Friend Profile Types (from components)
export interface Schedule {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  is_favorite: boolean;
}

export interface ScheduleDetail {
  id: number;
  name: string;
  description?: string;
  is_favorite: boolean;
  created_at: string;
  courses: Array<{
    id: number;
    code: string;
    name: string;
    description?: string;
    department: string;
    sections: Array<{
      id: number;
      section_number: string;
      professor?: string;
      capacity: number;
      enrolled: number;
      sessions: Array<{
        id: number;
        session_type: string;
        day: string;
        start_time: string;
        end_time: string;
        location?: string;
        building?: string;
        room?: string;
        modality: string;
      }>;
    }>;
  }>;
}
