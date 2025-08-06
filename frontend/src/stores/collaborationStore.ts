import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  joined_at: string;
}

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
  participants: User[];
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
  user: User;
  added_at: string;
}

interface CollaborationState {
  // Current session
  currentSession: CollaborativeSession | null;
  isConnected: boolean;
  
  // Sessions
  sessions: CollaborativeSession[];
  
  // Shared schedules
  sharedSchedules: ScheduleShare[];
  
  // Schedule comparisons
  comparisons: ScheduleComparison[];
  
  // Course selections for current session
  courseSelections: any[];
  
  // Generated schedule data
  generatedSchedule: any;
  
  // Real-time collaboration state
  onlineUsers: User[];
  typingUsers: number[];
  cursorPositions: { [userId: number]: any };
  
  // Actions
  setCurrentSession: (session: CollaborativeSession | null) => void;
  setIsConnected: (connected: boolean) => void;
  setSessions: (sessions: CollaborativeSession[]) => void;
  addSession: (session: CollaborativeSession) => void;
  updateSession: (sessionCode: string, updates: Partial<CollaborativeSession>) => void;
  
  setSharedSchedules: (schedules: ScheduleShare[]) => void;
  addSharedSchedule: (schedule: ScheduleShare) => void;
  
  setComparisons: (comparisons: ScheduleComparison[]) => void;
  addComparison: (comparison: ScheduleComparison) => void;
  removeComparison: (comparisonId: number) => void;
  
  // Course selection actions
  setCourseSelections: (selections: any[]) => void;
  addCourseSelection: (selection: any) => void;
  removeCourseSelection: (index: number) => void;
  updateCourseSelections: (selections: any[]) => void;
  
  // Generated schedule actions
  setGeneratedSchedule: (schedule: any) => void;
  
  // Real-time updates
  updateOnlineUsers: (users: User[]) => void;
  addOnlineUser: (user: User) => void;
  removeOnlineUser: (userId: number) => void;
  
  setTypingUsers: (userIds: number[]) => void;
  addTypingUser: (userId: number) => void;
  removeTypingUser: (userId: number) => void;
  
  updateCursorPosition: (userId: number, position: any) => void;
  removeCursorPosition: (userId: number) => void;
  
  // Schedule updates
  updateScheduleData: (data: any) => void;
  
  // Clear state
  clearSession: () => void;
  clearAll: () => void;
}

export const useCollaborationStore = create<CollaborationState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentSession: null,
        isConnected: false,
        sessions: [],
        sharedSchedules: [],
        comparisons: [],
        courseSelections: [],
        generatedSchedule: null,
        onlineUsers: [],
        typingUsers: [],
        cursorPositions: {},

      // Session actions
      setCurrentSession: (session: CollaborativeSession | null) => set({ currentSession: session }),
      setIsConnected: (connected: boolean) => set({ isConnected: connected }),
      
      setSessions: (sessions: CollaborativeSession[]) => set({ sessions }),
      addSession: (session: CollaborativeSession) => set((state) => ({
        sessions: [...state.sessions, session]
      })),
      updateSession: (sessionCode: string, updates: Partial<CollaborativeSession>) => set((state) => ({
        sessions: state.sessions.map(session =>
          session.session_code === sessionCode
            ? { ...session, ...updates }
            : session
        ),
        currentSession: state.currentSession?.session_code === sessionCode
          ? { ...state.currentSession, ...updates }
          : state.currentSession
      })),

      // Shared schedules actions
      setSharedSchedules: (schedules: ScheduleShare[]) => set({ sharedSchedules: schedules }),
      addSharedSchedule: (schedule: ScheduleShare) => set((state) => ({
        sharedSchedules: [...state.sharedSchedules, schedule]
      })),

      // Comparisons actions
      setComparisons: (comparisons: ScheduleComparison[]) => set({ comparisons }),
      addComparison: (comparison: ScheduleComparison) => set((state) => ({
        comparisons: [...state.comparisons, comparison]
      })),
      removeComparison: (comparisonId: number) => set((state) => ({
        comparisons: state.comparisons.filter(c => c.id !== comparisonId)
      })),

      // Course selection actions
      setCourseSelections: (selections: any[]) => set({ courseSelections: selections }),
      addCourseSelection: (selection: any) => set((state) => ({
        courseSelections: [...state.courseSelections, selection]
      })),
      removeCourseSelection: (index: number) => set((state) => ({
        courseSelections: state.courseSelections.filter((_, i) => i !== index)
      })),
      updateCourseSelections: (selections: any[]) => set({ courseSelections: selections }),

      // Generated schedule actions
      setGeneratedSchedule: (schedule: any) => set({ generatedSchedule: schedule }),

      // Real-time collaboration actions
      updateOnlineUsers: (users: User[]) => set({ onlineUsers: users }),
      addOnlineUser: (user: User) => set((state) => ({
        onlineUsers: [...state.onlineUsers.filter(u => u.id !== user.id), user]
      })),
      removeOnlineUser: (userId: number) => set((state) => ({
        onlineUsers: state.onlineUsers.filter(u => u.id !== userId)
      })),

      setTypingUsers: (userIds: number[]) => set({ typingUsers: userIds }),
      addTypingUser: (userId: number) => set((state) => ({
        typingUsers: [...new Set([...state.typingUsers, userId])]
      })),
      removeTypingUser: (userId: number) => set((state) => ({
        typingUsers: state.typingUsers.filter(id => id !== userId)
      })),

      updateCursorPosition: (userId: number, position: any) => set((state) => ({
        cursorPositions: { ...state.cursorPositions, [userId]: position }
      })),
      removeCursorPosition: (userId: number) => set((state) => {
        const { [userId]: removed, ...rest } = state.cursorPositions;
        return { cursorPositions: rest };
      }),

      // Schedule updates
      updateScheduleData: (data: any) => set((state) => ({
        currentSession: state.currentSession
          ? { ...state.currentSession, current_schedule_data: data }
          : null
      })),

      // Clear actions
      clearSession: () => set({
        currentSession: null,
        isConnected: false,
        courseSelections: [],
        generatedSchedule: null,
        onlineUsers: [],
        typingUsers: [],
        cursorPositions: {},
        comparisons: []
      }),
      
      clearAll: () => set({
        currentSession: null,
        isConnected: false,
        sessions: [],
        sharedSchedules: [],
        comparisons: [],
        courseSelections: [],
        generatedSchedule: null,
        onlineUsers: [],
        typingUsers: [],
        cursorPositions: {}
      })
    }),
    {
        name: 'collaboration-store',
        partialize: (state) => ({
          sessions: state.sessions,
          sharedSchedules: state.sharedSchedules,
          currentSession: state.currentSession,
          courseSelections: state.courseSelections,
          generatedSchedule: state.generatedSchedule
        })
      }
    ),
    {
      name: 'collaboration-store-devtools'
    }
  )
);
