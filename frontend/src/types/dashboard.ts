import { User } from './user';
import { Course } from './academic';

// Dashboard Specific Types
export interface SectionPopupState {
  courseId: number;
  course: Course;
}

export interface GroupedCourse {
  courseName: string;
  courseCode: string;
  sections: Array<any & { index: number }>; // Will be imported from schedule types
}

export interface SidebarSection {
  id: string;
  title: string;
  shortTitle: string;
  icon: any; // Lucide icon component
  color: string;
}

// Component Props Types
export interface FirstTimeUserPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export interface CourseResultsGridProps {
  searchQuery: string;
  selectedFilters: any;
  onSectionSelect: (section: any) => void;
}

export interface CourseSearchCardProps {
  course: Course;
  onSectionSelect: (section: any) => void;
}

export interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

export interface DashboardLayoutProps {
  children: React.ReactNode;
}

export interface SectionSelectionPopupProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onSectionSelect: (section: any) => void;
}

export interface SelectedSectionsCardProps {
  selectedSections: any[];
  onRemoveSection: (sectionId: number) => void;
}
