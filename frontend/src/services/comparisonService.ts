import { 
  ScheduleComparison, 
  ComparisonParticipant, 
  ComparisonConflict, 
  ScheduleCombination,
  Session as TypedSession,
  CourseSection as TypedCourseSection
} from '@/types'
import { api } from './auth'

export class ComparisonService {
  private participantColors = [
    '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#F97316', 
    '#06B6D4', '#84CC16', '#EC4899', '#6366F1', '#14B8A6'
  ]

  // Create a new comparison
  createComparison(name: string): ScheduleComparison {
    const comparison: ScheduleComparison = {
      id: this.generateId(),
      name,
      participants: [],
      selectedCombinations: [],
      conflicts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return comparison
  }

  // Add participant by friend data
  async addParticipantByFriend(
    comparison: ScheduleComparison,
    friendId: number,
    friendName: string,
    schedules: any[]
  ): Promise<{ success: boolean; participant?: ComparisonParticipant; error?: string }> {
    try {
      // Convert friend schedules to ScheduleCombination format
      const scheduleCombinations: ScheduleCombination[] = schedules.map(schedule => ({
        combination_id: schedule.id.toString(),
        course_count: 0, // Will be calculated from courses
        courses: schedule.courses || [],
        sections: schedule.sections || [],
        conflicts: []
      }))

      // Create participant
      const participant: ComparisonParticipant = {
        id: `friend_${friendId}`,
        name: friendName,
        color: this.getNextAvailableColor(comparison.participants),
        schedules: scheduleCombinations,
        isVisible: true
      }

      return { success: true, participant }
    } catch (error) {
      return { success: false, error: 'Error al cargar los horarios del amigo' }
    }
  }

  // Add participant by share code
  async addParticipantByCode(
    comparison: ScheduleComparison, 
    shareCode: string, 
    participantName?: string
  ): Promise<{ success: boolean; participant?: ComparisonParticipant; error?: string }> {
    try {
      // Fetch shared schedule data
      const response = await api.get(`/collaboration/shared/${shareCode}`)
      const shareData = response.data


      if (!shareData || !shareData.schedule) {
        return { success: false, error: 'Código de horario no válido' }
      }

      // Extract schedule data
      const scheduleData = shareData.schedule
      const name = participantName || shareData.shared_by?.name || `Usuario ${comparison.participants.length + 1}`

      // Convert schedule data to ScheduleCombination format
      const schedules: ScheduleCombination[] = [{
        combination_id: shareCode,
        course_count: scheduleData.combination?.courses?.length || 0,
        courses: scheduleData.combination?.courses || [],
        sections: scheduleData.combination?.sections || [],
        conflicts: []
      }]

      // Create participant
      const participant: ComparisonParticipant = {
        id: this.generateId(),
        name,
        color: this.getNextAvailableColor(comparison.participants),
        schedules,
        isVisible: true
      }

      return { success: true, participant }
    } catch (error) {
      return { success: false, error: 'Error al cargar el horario compartido' }
    }
  }

  // Add multiple schedules for a participant
  addSchedulesToParticipant(
    participant: ComparisonParticipant,
    schedules: ScheduleCombination[]
  ): ComparisonParticipant {
    return {
      ...participant,
      schedules: [...participant.schedules, ...schedules]
    }
  }

  // Toggle participant visibility
  toggleParticipantVisibility(
    comparison: ScheduleComparison,
    participantId: string
  ): ScheduleComparison {
    return {
      ...comparison,
      participants: comparison.participants.map(p =>
        p.id === participantId ? { ...p, isVisible: !p.isVisible } : p
      ),
      updatedAt: new Date().toISOString()
    }
  }

  // Set selected combination for a participant
  setParticipantCombination(
    comparison: ScheduleComparison,
    participantId: string,
    combinationId: string
  ): ScheduleComparison {
    const updatedCombinations = comparison.selectedCombinations.filter(
      sc => sc.participantId !== participantId
    )
    
    updatedCombinations.push({ participantId, combinationId })

    const updatedComparison = {
      ...comparison,
      selectedCombinations: updatedCombinations,
      updatedAt: new Date().toISOString()
    }

    // Recalculate conflicts
    return this.detectConflicts(updatedComparison)
  }

  // Detect time conflicts between visible participants
  detectConflicts(comparison: ScheduleComparison): ScheduleComparison {
    const conflicts: ComparisonConflict[] = []
    const visibleParticipants = comparison.participants.filter(p => p.isVisible)

    // Get all sessions from visible participants with their selected combinations
    const allSessions: Array<{
      participantId: string
      scheduleId: string
      session: TypedSession & { courseCode: string; courseName: string; sessionId: number }
    }> = []

    visibleParticipants.forEach(participant => {
      const selectedCombination = comparison.selectedCombinations.find(
        sc => sc.participantId === participant.id
      )
      
      if (!selectedCombination) return

      const schedule = participant.schedules.find(
        s => s.combination_id === selectedCombination.combinationId
      )
      
      if (!schedule) return

      schedule.courses?.forEach((course: TypedCourseSection) => {
        course.sessions?.forEach((session: TypedSession) => {
          allSessions.push({
            participantId: participant.id,
            scheduleId: schedule.combination_id.toString(),
            session: {
              ...session,
              courseCode: course.course_code,
              courseName: course.course_name,
              sessionId: session.id || 0
            }
          })
        })
      })
    })

    // Check for overlaps
    for (let i = 0; i < allSessions.length; i++) {
      for (let j = i + 1; j < allSessions.length; j++) {
        const session1 = allSessions[i]
        const session2 = allSessions[j]

        // Skip if same participant
        if (session1.participantId === session2.participantId) continue

        // Check if sessions overlap
        if (this.sessionsOverlap(session1.session, session2.session)) {
          // Find existing conflict or create new one
          const existingConflict = conflicts.find(conflict =>
            this.timeSlotMatches(conflict.timeSlot, session1.session) &&
            conflict.participants.includes(session1.participantId) &&
            conflict.participants.includes(session2.participantId)
          )

          if (!existingConflict) {
            const conflict: ComparisonConflict = {
              type: 'time_overlap',
              participants: [session1.participantId, session2.participantId],
              timeSlot: {
                day: session1.session.day_of_week,
                startTime: this.getOverlapStart(session1.session, session2.session),
                endTime: this.getOverlapEnd(session1.session, session2.session)
              },
              affectedSessions: [
                {
                  participantId: session1.participantId,
                  scheduleId: session1.scheduleId,
                  sessionId: session1.session.sessionId,
                  courseCode: session1.session.courseCode,
                  courseName: session1.session.courseName
                },
                {
                  participantId: session2.participantId,
                  scheduleId: session2.scheduleId,
                  sessionId: session2.session.sessionId,
                  courseCode: session2.session.courseCode,
                  courseName: session2.session.courseName
                }
              ]
            }
            conflicts.push(conflict)
          } else {
            // Add sessions to existing conflict if not already present
            const session1Exists = existingConflict.affectedSessions.some(
              s => s.participantId === session1.participantId && s.sessionId === session1.session.sessionId
            )
            const session2Exists = existingConflict.affectedSessions.some(
              s => s.participantId === session2.participantId && s.sessionId === session2.session.sessionId
            )

            if (!session1Exists) {
              existingConflict.affectedSessions.push({
                participantId: session1.participantId,
                scheduleId: session1.scheduleId,
                sessionId: session1.session.sessionId,
                courseCode: session1.session.courseCode,
                courseName: session1.session.courseName
              })
            }

            if (!session2Exists) {
              existingConflict.affectedSessions.push({
                participantId: session2.participantId,
                scheduleId: session2.scheduleId,
                sessionId: session2.session.sessionId,
                courseCode: session2.session.courseCode,
                courseName: session2.session.courseName
              })
            }
          }
        }
      }
    }

    return {
      ...comparison,
      conflicts
    }
  }

  // Helper methods
  private generateId(): string {
    return Math.random().toString(36).substring(2, 11)
  }

  private getNextAvailableColor(participants: ComparisonParticipant[]): string {
    const usedColors = new Set(participants.map(p => p.color))
    
    for (const color of this.participantColors) {
      if (!usedColors.has(color)) {
        return color
      }
    }

    // If all colors are used, return a random one
    return this.participantColors[participants.length % this.participantColors.length]
  }

  private sessionsOverlap(session1: TypedSession, session2: TypedSession): boolean {
    // Check if same day
    if (session1.day_of_week !== session2.day_of_week) return false

    const start1 = this.timeToMinutes(session1.start_time)
    const end1 = this.timeToMinutes(session1.end_time)
    const start2 = this.timeToMinutes(session2.start_time)
    const end2 = this.timeToMinutes(session2.end_time)

    // Check for overlap
    return start1 < end2 && start2 < end1
  }

  private timeSlotMatches(timeSlot: any, session: TypedSession): boolean {
    return timeSlot.day === session.day_of_week &&
           timeSlot.startTime === session.start_time &&
           timeSlot.endTime === session.end_time
  }

  private getOverlapStart(session1: TypedSession, session2: TypedSession): string {
    const start1 = this.timeToMinutes(session1.start_time)
    const start2 = this.timeToMinutes(session2.start_time)
    return this.minutesToTime(Math.max(start1, start2))
  }

  private getOverlapEnd(session1: TypedSession, session2: TypedSession): string {
    const end1 = this.timeToMinutes(session1.end_time)
    const end2 = this.timeToMinutes(session2.end_time)
    return this.minutesToTime(Math.min(end1, end2))
  }

  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }
}

export const comparisonService = new ComparisonService()