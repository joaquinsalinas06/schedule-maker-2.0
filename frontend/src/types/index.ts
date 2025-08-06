// Re-export all types from organized modules
export * from './academic';
export * from './user';
export * from './schedule';
export * from './comparison';
export * from './collaboration';
export * from './dashboard';
export * from './components';

// Legacy exports for backward compatibility
// These will be removed once all imports are updated
export type { University, Course, Section, Session, CourseSection } from './academic';
export type { User, UserProfileUpdate, LoginRequest, RegisterRequest, AuthResponse, FriendRequest } from './user';
export type { 
  ScheduleRequest, 
  ScheduleCombination, 
  ScheduleResponse, 
  FavoriteSchedule, 
  SelectedSection, 
  Filter, 
  ScheduleSlot, 
  ScheduleConflict, 
  ScheduleFilters, 
  ShareResponse, 
  SharedScheduleData 
} from './schedule';
export type { 
  ComparisonParticipant, 
  ComparisonConflict, 
  ScheduleComparison, 
  ComparisonVisualizationProps 
} from './comparison';
export type { SectionPopupState, GroupedCourse, SidebarSection } from './dashboard';