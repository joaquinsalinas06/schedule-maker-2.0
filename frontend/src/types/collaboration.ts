import { User } from './user';

// Collaboration-specific User interface (for sessions)
export interface CollaborationUser {
  id: number;
  name: string;
  email: string;
  role: string;
  joined_at: string;
}

// Collaboration Types (from collaborationStore)
export interface CollaborativeSession {
  id: number;
  name: string;
  description?: string;
  session_code: string;
  university_id: number;
  created_by: number;
  is_active: boolean;
  max_participants: number;
  current_schedule_data?: any;
  expires_at?: string;
  participants: CollaborationUser[];
}

export interface ScheduleShare {
  id: number;
  schedule_id: number;
  shared_by: number;
  shared_with?: number;
  share_token: string;
  permissions: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

export interface ScheduleComparison {
  id: number;
  session_id: number;
  user_id: number;
  schedule_id: number;
  schedule: any;
  user: CollaborationUser;
  added_at: string;
}

// Collaboration API Types
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

export interface CourseSelection {
  id?: number;
  course_code: string;
  course_name: string;
  section_code: string;
  professor?: string;
  selection_type: 'shared' | 'individual';
  shared_with_users: number[];
  priority: number;
  added_by?: number;
  is_active?: boolean;
  schedule_data: any;
}

export interface CourseSelectionCreate {
  course_code: string;
  course_name: string;
  section_code: string;
  professor?: string;
  selection_type: 'shared' | 'individual';
  shared_with_users: number[];
  priority?: number;
  schedule_data: any;
}

export interface GenerateSchedulesRequest {
  session_id: number;
  course_selections: CourseSelection[];
  personalized_schedules?: any[];
}

// Collaborative Course Selection (from components)
export interface CollaborativeCourseSelection {
  id: string;
  user_id: number;
  course_id: number;
  section_ids: number[];
  priority: number;
  created_at: string;
  user: User;
  course: {
    id: number;
    code: string;
    name: string;
    sections: any[];
  };
}

// Component Props Types
export interface SharedScheduleManagerProps {
  autoLoadCode?: string | null;
}

export interface FriendInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionCode: string;
  sessionName: string;
  onInviteSent: (friendIds: number[]) => void;
}

export interface CourseSelectionListProps {
  selections: CollaborativeCourseSelection[];
  currentUserId: number;
  onRemoveSelection: (selectionId: string) => void;
  onUpdatePriority: (selectionId: string, priority: number) => void;
}

export interface ScheduleGenerationSectionProps {
  selections: CollaborativeCourseSelection[];
  onGenerate: () => void;
  loading: boolean;
}

export interface CourseSearchSectionProps {
  onCourseSelect: (course: any, sectionIds: number[], priority?: number) => void;
  loading: boolean;
}
