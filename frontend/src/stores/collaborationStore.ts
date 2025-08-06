import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { 
  CollaborativeSession, 
  ScheduleShare, 
  CollaborationUser
} from '@/types/collaboration';
import { ScheduleComparison } from '@/types/comparison';

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
  activeComparison: ScheduleComparison | null;
  
  // Course selections for current session
  courseSelections: any[];
  
  // Generated schedule data
  generatedSchedule: any;
  
  // Real-time collaboration state
  onlineUsers: CollaborationUser[];
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
  removeComparison: (comparisonId: string) => void;
  setActiveComparison: (comparison: ScheduleComparison | null) => void;
  
  // Course selection actions
  setCourseSelections: (selections: any[]) => void;
  addCourseSelection: (selection: any) => void;
  removeCourseSelection: (index: number) => void;
  updateCourseSelections: (selections: any[]) => void;
  
  // Generated schedule actions
  setGeneratedSchedule: (schedule: any) => void;
  
  // Real-time updates
  updateOnlineUsers: (users: CollaborationUser[]) => void;
  addOnlineUser: (user: CollaborationUser) => void;
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
  
  // Security: Clear user-specific data on logout
  clearUserData: () => void;
}

// Helper function to get user-specific storage key
const getUserStorageKey = () => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return 'collaboration-store-anonymous';
  }
  
  try {
    const user = localStorage.getItem('user');
    if (user) {
      const parsedUser = JSON.parse(user);
      return `collaboration-store-user-${parsedUser.id}`;
    }
  } catch (error) {
    console.warn('Failed to get user for storage key:', error);
  }
  return 'collaboration-store-anonymous';
};

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
        activeComparison: null,
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
      removeComparison: (comparisonId: string) => set((state) => ({
        comparisons: state.comparisons.filter(c => c.id !== comparisonId)
      })),
      setActiveComparison: (comparison: ScheduleComparison | null) => set({ activeComparison: comparison }),

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
      updateOnlineUsers: (users: CollaborationUser[]) => set({ onlineUsers: users }),
      addOnlineUser: (user: CollaborationUser) => set((state) => ({
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
      }),
      
      // Security: Clear user-specific data on logout
      clearUserData: () => {
        // Clear all state immediately
        set({
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
        });
        
        // Also clear any persisted data for all potential user keys
        // This ensures complete cleanup even if switching between users
        if (typeof window !== 'undefined') {
          try {
            const keysToCheck = [];
            
            // Check for user-specific keys that might exist
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('collaboration-store')) {
                keysToCheck.push(key);
              }
            }
            
            // Clear all collaboration-related keys
            keysToCheck.forEach(key => {
              localStorage.removeItem(key);
            });
            
            console.log('🧹 Cleared collaboration data for security:', keysToCheck);
          } catch (error) {
            console.warn('Failed to clear collaboration storage:', error);
          }
        }
      }
    }),
    {
        name: getUserStorageKey(), // ✅ USER-SPECIFIC STORAGE KEY
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
