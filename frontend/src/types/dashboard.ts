import { Course } from './academic';

// Dashboard Specific Types
export interface SectionPopupState {
  courseId: number;
  course: Course;
}

export interface GroupedCourse {
  courseName: string;
  courseCode: string;
  sections: Array<any & { index: number }>;
}

export interface SidebarSection {
  id: string;
  title: string;
  shortTitle: string;
  icon: any; // Lucide icon component
  color: string;
}
