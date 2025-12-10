import { User, Schedule } from './user';

// Profile Modal Types
export interface FriendProfileModalProps {
  friendId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onViewSchedules: (friendId: number, schedules: Schedule[]) => void;
}
