import { User, Schedule, ScheduleDetail } from './user';
import { VisualizationSession, VisualizationCourseSection } from './schedule';

// Profile Modal Types
export interface FriendProfileModalProps {
  friendId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onViewSchedules: (friendId: number, schedules: Schedule[]) => void;
}

export interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onProfileUpdate: (updatedUser: User) => void;
}

// Edit Field Type
export type EditField = 'personal' | 'photo' | 'description';

// Hook Types
export interface UseAutocompleteOptions {
  delay?: number;
  minLength?: number;
  maxResults?: number;
}

export interface UseAutocompleteResult {
  query: string;
  suggestions: any[];
  loading: boolean;
  setQuery: (query: string) => void;
  selectSuggestion: (suggestion: any) => void;
}

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
}

export interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

// UI Component Props
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

export interface ToastContextType {
  toasts: ToastProps[];
  addToast: (toast: ToastProps) => void;
  removeToast: (id: string) => void;
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

// Schedule Visualization Types (from ScheduleVisualization component)
export interface VisualizationScheduleCombination {
  combination_id: string;
  courses: VisualizationCourseSection[];
  conflicts: any[];
}

export interface ScheduleVisualizationProps {
  scheduleName?: string;
  scheduleData?: {
    combinations: VisualizationScheduleCombination[];
    total_combinations: number;
    selected_courses_count?: number;
  };
  showBackButton?: boolean;
}
