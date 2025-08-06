import { ScheduleCombination } from './schedule';

// Schedule Comparison Types
export interface ComparisonParticipant {
  id: string;
  name: string;
  color: string;
  schedules: ScheduleCombination[];
  isVisible: boolean;
}

export interface ComparisonConflict {
  type: 'time_overlap';
  participants: string[]; // participant IDs
  timeSlot: {
    day: string | number;
    startTime: string;
    endTime: string;
  };
  affectedSessions: Array<{
    participantId: string;
    scheduleId: string;
    sessionId: number;
    courseCode: string;
    courseName: string;
  }>;
}

export interface ScheduleComparison {
  id: string;
  name: string;
  participants: ComparisonParticipant[];
  selectedCombinations: Array<{
    participantId: string;
    combinationId: string;
  }>;
  conflicts: ComparisonConflict[];
  createdAt: string;
  updatedAt: string;
}

export interface ComparisonVisualizationProps {
  comparison: ScheduleComparison;
  onParticipantToggle?: (participantId: string) => void;
  onCombinationChange?: (participantId: string, combinationId: string) => void;
  onConflictHighlight?: (conflict: ComparisonConflict) => void;
}
