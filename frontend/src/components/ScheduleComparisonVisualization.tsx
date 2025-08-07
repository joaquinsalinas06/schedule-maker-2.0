"use client"

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Clock, Eye, EyeOff, Users, AlertTriangle, Palette } from "lucide-react"
import { 
  ComparisonVisualizationProps, 
  CourseSection as TypedCourseSection,
  Session as TypedSession
} from "@/types"

// Canvas dimensions and settings
let CANVAS_WIDTH = 1400
let CANVAS_HEIGHT = 900
let TOP_MARGIN = 0.15

// Responsive breakpoints
const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024
const DAY_COUNT = 6 // Monday to Saturday

const weekDayStrings = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]


// Conflict color (red - reserved)
const CONFLICT_COLOR = '#EF4444'

// Day name mapping
const dayNameToIndex: { [key: string]: number } = {
  "Monday": 0, "Tuesday": 1, "Wednesday": 2, 
  "Thursday": 3, "Friday": 4, "Saturday": 5, "Sunday": 6
}

const getResponsiveDimensions = (containerWidth: number) => {
  let width, height
  
  if (containerWidth <= MOBILE_BREAKPOINT) {
    width = Math.min(containerWidth - 32, 600)
    height = Math.round(width * 0.75)
  } else if (containerWidth <= TABLET_BREAKPOINT) {
    width = Math.min(containerWidth - 48, 900)
    height = Math.round(width * 0.65)
  } else {
    width = Math.min(containerWidth - 64, 1400)
    height = Math.round(width * 0.64)
  }
  
  return { width, height }
}

const getResponsiveMargins = (containerWidth: number) => {
  if (containerWidth <= MOBILE_BREAKPOINT) {
    return { topMargin: 0.08, sideMargin: 0.12 }
  } else if (containerWidth <= TABLET_BREAKPOINT) {
    return { topMargin: 0.10, sideMargin: 0.13 }
  } else {
    return { topMargin: 0.15, sideMargin: 0.15 }
  }
}

const getResponsiveFontSizes = (containerWidth: number) => {
  if (containerWidth <= MOBILE_BREAKPOINT) {
    return {
      titleFont: 12, infoFont: 9, headerFont: 10, timeFont: 9,
      courseFont: 8, professorFont: 7, locationFont: 7
    }
  } else if (containerWidth <= TABLET_BREAKPOINT) {
    return {
      titleFont: 18, infoFont: 14, headerFont: 12, timeFont: 11,
      courseFont: 10, professorFont: 9, locationFont: 8
    }
  } else {
    return {
      titleFont: 16, infoFont: 11, headerFont: 13, timeFont: 12,
      courseFont: 11, professorFont: 10, locationFont: 9
    }
  }
}

export function ScheduleComparisonVisualization({ 
  comparison, 
  onParticipantToggle
}: ComparisonVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(1400)
  const [startTime, setStartTime] = useState(7 * 60) // 7:00 AM
  const [endTime, setEndTime] = useState(22 * 60)   // 10:00 PM
  const [highlightedConflicts] = useState<Set<string>>(new Set())

  const drawComparison = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Get responsive settings
    const fontSizes = getResponsiveFontSizes(containerWidth)
    const margins = getResponsiveMargins(containerWidth)
    TOP_MARGIN = margins.topMargin

    // Setup canvas
    const dpr = window.devicePixelRatio || 1
    canvas.style.width = CANVAS_WIDTH + 'px'
    canvas.style.height = CANVAS_HEIGHT + 'px'
    canvas.width = CANVAS_WIDTH * dpr
    canvas.height = CANVAS_HEIGHT * dpr
    ctx.scale(dpr, dpr)
    ctx.imageSmoothingEnabled = true
    ctx.textBaseline = 'top'

    // Calculate dimensions
    const dayWidth = (CANVAS_WIDTH * (1 - margins.sideMargin)) / DAY_COUNT
    const hourCount = (endTime - startTime) / 60.0
    const hourHeight = (CANVAS_HEIGHT * (1 - TOP_MARGIN)) / hourCount
    const topMarginOffset = CANVAS_HEIGHT * TOP_MARGIN
    const sideMarginOffset = CANVAS_WIDTH * margins.sideMargin

    // Clear canvas with dark background
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw borders
    ctx.lineWidth = 1
    ctx.strokeStyle = '#475569'
    ctx.beginPath()
    ctx.rect(0.5, 0.5, CANVAS_WIDTH - 1, CANVAS_HEIGHT - 1)
    ctx.stroke()

    // Draw margin lines
    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(sideMarginOffset, 0)
    ctx.lineTo(sideMarginOffset, CANVAS_HEIGHT)
    ctx.moveTo(0, topMarginOffset)
    ctx.lineTo(CANVAS_WIDTH, topMarginOffset)
    ctx.stroke()

    // Draw title
    const headerY = 30
    const infoSpacing = 16
    
    ctx.fillStyle = '#f1f5f9'
    ctx.font = `bold ${fontSizes.titleFont}px "cascadia-code", system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(`Comparación: ${comparison.name}`, CANVAS_WIDTH / 2, headerY)

    // Draw stats
    const visibleParticipants = comparison.participants.filter(p => p.isVisible)
    ctx.font = `semibold ${fontSizes.infoFont}px "cascadia-code", system-ui, sans-serif`
    ctx.fillStyle = '#a855f7'
    ctx.fillText(`${visibleParticipants.length} participantes • ${comparison.conflicts.length} conflictos`, CANVAS_WIDTH / 2, headerY + infoSpacing)

    // Draw day headers
    ctx.fillStyle = '#f1f5f9'
    ctx.font = `bold ${fontSizes.timeFont + 2}px "cascadia-code", system-ui, sans-serif`
    ctx.textAlign = 'center'
    for (let day = 0; day < DAY_COUNT; day++) {
      const xPos = sideMarginOffset + dayWidth * (day + 0.5)
      
      // Header background
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(sideMarginOffset + dayWidth * day + 1, 1, dayWidth - 2, topMarginOffset - 2)
      
      // Day name
      ctx.fillStyle = '#f1f5f9'
      ctx.fillText(weekDayStrings[day], xPos, topMarginOffset - 35)
    }

    // Draw grid lines
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1
    
    // Vertical day lines
    for (let day = 1; day <= DAY_COUNT; day++) {
      const xPos = sideMarginOffset + dayWidth * day
      ctx.beginPath()
      ctx.moveTo(xPos, 0)
      ctx.lineTo(xPos, CANVAS_HEIGHT)
      ctx.stroke()
    }

    // Horizontal hour lines and time labels
    ctx.strokeStyle = '#1e293b'
    ctx.font = `${fontSizes.timeFont}px "cascadia-code", system-ui, sans-serif`
    ctx.textAlign = 'right'
    ctx.fillStyle = '#94a3b8'
    
    for (let hour = 0; hour <= hourCount; hour++) {
      const yPos = topMarginOffset + hourHeight * hour
      const timeMinutes = startTime + hour * 60
      
      // Draw time label centered in the cell (except for the last line)
      if (hour < hourCount) {
        // Set text baseline to middle for proper centering
        ctx.textBaseline = 'middle'
        const centerY = yPos + (hourHeight / 2)
        ctx.fillText(minutesToTime(timeMinutes), sideMarginOffset - 12, centerY)
        // Reset text baseline back to top
        ctx.textBaseline = 'top'
      }
      
      ctx.beginPath()
      ctx.moveTo(0, yPos)
      ctx.lineTo(CANVAS_WIDTH, yPos)
      ctx.stroke()
    }

    // Draw schedules for each visible participant
    visibleParticipants.forEach(participant => {
      const selectedCombination = comparison.selectedCombinations.find(
        sc => sc.participantId === participant.id
      )
      
      if (!selectedCombination) return

      const schedule = participant.schedules.find(
        s => s.combination_id === selectedCombination.combinationId
      )
      
      if (!schedule) return

      // Draw schedule blocks
      schedule.courses?.forEach((courseSection: TypedCourseSection) => {
        if (!courseSection.sessions || courseSection.sessions.length === 0) return

        courseSection.sessions.forEach((session: TypedSession) => {
          let dayIndex: number
          if (typeof session.day_of_week === 'string') {
            dayIndex = dayNameToIndex[session.day_of_week]
            if (dayIndex === undefined) return
          } else {
            dayIndex = session.day_of_week - 1
          }

          if (dayIndex < 0 || dayIndex >= DAY_COUNT) return

          const sessionStartMinutes = timeToMinutes(session.start_time)
          const sessionEndMinutes = timeToMinutes(session.end_time)
          
          if (sessionStartMinutes < startTime || sessionEndMinutes > endTime) return

          const xPos = sideMarginOffset + dayWidth * dayIndex
          const yPos = topMarginOffset + (hourHeight * (sessionStartMinutes - startTime) / 60)
          const duration = (sessionEndMinutes - sessionStartMinutes) / 60
          const blockHeight = duration * hourHeight

          if (!isFinite(xPos) || !isFinite(yPos) || !isFinite(blockHeight) || blockHeight <= 0) return

          // Check if this session is part of a conflict
          const isInConflict = comparison.conflicts.some(conflict =>
            conflict.affectedSessions.some(affectedSession =>
              affectedSession.participantId === participant.id &&
              affectedSession.sessionId === session.id
            )
          )

          // Determine color
          const blockColor = isInConflict ? CONFLICT_COLOR : participant.color

          // Draw shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
          ctx.fillRect(xPos + 6, yPos + 4, dayWidth - 8, blockHeight - 6)

          // Draw main block
          ctx.fillStyle = blockColor + 'E6' // Add transparency
          ctx.fillRect(xPos + 4, yPos + 2, dayWidth - 8, blockHeight - 4)

          // Draw border
          ctx.strokeStyle = blockColor
          ctx.lineWidth = isInConflict ? 3 : 2
          ctx.strokeRect(xPos + 4, yPos + 2, dayWidth - 8, blockHeight - 4)

          // Draw text
          ctx.fillStyle = '#ffffff'
          ctx.textAlign = 'left'
          const textX = xPos + 12
          const textY = yPos + 16
          const maxWidth = dayWidth - 24

          // Helper function for fitting text
          const drawFittingText = (text: string, x: number, y: number, maxWidth: number, fontSize: number, fontWeight: string = 'normal') => {
            ctx.font = `${fontWeight} ${fontSize}px "cascadia-code", system-ui, sans-serif`
            
            let displayText = text
            const textWidth = ctx.measureText(displayText).width
            
            if (textWidth > maxWidth) {
              let start = 0
              let end = text.length
              
              while (start < end) {
                const mid = Math.floor((start + end + 1) / 2)
                const testText = text.substring(0, mid) + '...'
                if (ctx.measureText(testText).width <= maxWidth) {
                  start = mid
                } else {
                  end = mid - 1
                }
              }
              
              displayText = start > 3 ? text.substring(0, start - 3) + '...' : text.substring(0, Math.max(1, start))
            }
            
            ctx.fillText(displayText, x, y)
            return fontSize + 4
          }

          let currentY = textY
          
          // Course name and participant indicator  
          const courseText = `${courseSection.course_name} (${participant.name})`
          const courseHeight = drawFittingText(courseText, textX, currentY, maxWidth, fontSizes.courseFont, 'bold')
          currentY += courseHeight + 2

          // Time
          if (blockHeight > 45) {
            const timeText = `${session.start_time} - ${session.end_time}`
            drawFittingText(timeText, textX, currentY, maxWidth, fontSizes.timeFont - 1, 'semibold')
          }
        })
      })
    })
  }, [comparison, startTime, endTime, containerWidth])

  // Handle container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth
        setContainerWidth(width)
        const dimensions = getResponsiveDimensions(width)
        CANVAS_WIDTH = dimensions.width
        CANVAS_HEIGHT = dimensions.height
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Redraw when data changes
  useEffect(() => {
    // Debounce the drawing to prevent excessive calls
    const timeoutId = setTimeout(() => {
      const dimensions = getResponsiveDimensions(containerWidth)
      CANVAS_WIDTH = dimensions.width
      CANVAS_HEIGHT = dimensions.height
      drawComparison()
    }, 50) // 50ms debounce

    return () => clearTimeout(timeoutId)
  }, [comparison, startTime, endTime, containerWidth, highlightedConflicts, drawComparison])

  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  const downloadComparison = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `comparison_${comparison.name}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const toggleParticipant = (participantId: string) => {
    if (onParticipantToggle) {
      onParticipantToggle(participantId)
    }
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Users className="w-5 h-5" />
              {comparison.name}
            </CardTitle>
            <CardDescription>
              {comparison.participants.length} participantes • {comparison.conflicts.length} conflictos detectados
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={downloadComparison}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0"
            >
              <Download className="w-4 h-4 mr-1" />
              Descargar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Participants Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Participantes
                </h3>
                <div className="space-y-2">
                  {comparison.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: participant.color }}
                        />
                        <div>
                          <div className="font-medium text-sm text-foreground">{participant.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {participant.schedules.length} horarios
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleParticipant(participant.id)}
                        className="p-1"
                      >
                        {participant.isVisible ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Conflicts Summary */}
                {comparison.conflicts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-md font-semibold text-foreground flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      Conflictos
                    </h4>
                    <div className="space-y-2">
                      {comparison.conflicts.map((conflict, index) => (
                        <div key={index} className="p-2 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 rounded-md">
                          <div className="text-xs font-medium text-red-800 dark:text-red-200">
                            {weekDayStrings[typeof conflict.timeSlot.day === 'string' ? 
                              dayNameToIndex[conflict.timeSlot.day] || 0 : 
                              conflict.timeSlot.day - 1
                            ]} {conflict.timeSlot.startTime} - {conflict.timeSlot.endTime}
                          </div>
                          <div className="text-xs text-red-600 dark:text-red-300">
                            {conflict.participants.length} participantes afectados
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Schedule Canvas */}
            <div className="lg:col-span-3">
              <div ref={containerRef} className="border border-border rounded-lg bg-slate-900 p-6 shadow-inner">
                <canvas
                  ref={canvasRef}
                  className="w-full h-auto max-w-full rounded-md shadow-sm"
                  style={{ backgroundColor: '#0f172a' }}
                />
              </div>
            </div>
          </div>

          {/* Time Settings */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 border border-border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground font-medium">Horario:</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-foreground">Desde:</label>
                <input
                  type="time"
                  value={minutesToTime(startTime)}
                  onChange={(e) => setStartTime(timeToMinutes(e.target.value))}
                  className="px-2 py-1 text-xs border border-border rounded bg-background text-foreground"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-foreground">Hasta:</label>
                <input
                  type="time"
                  value={minutesToTime(endTime)}
                  onChange={(e) => setEndTime(timeToMinutes(e.target.value))}
                  className="px-2 py-1 text-xs border border-border rounded bg-background text-foreground"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}