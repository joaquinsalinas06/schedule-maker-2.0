"use client"

import React, { useRef, useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Download, Calendar, Clock, Heart, ArrowLeft } from "lucide-react"

interface Session {
  session_id: number
  session_type: string
  day: string | number // Can be either string name or number
  start_time: string
  end_time: string
  location: string
  modality: string
}

interface CourseSection {
  course_id: number
  course_code: string
  course_name: string
  section_id: number
  section_number: string
  credits: number
  professor: string
  sessions: Session[]
}

interface ScheduleCombination {
  combination_id: string
  total_credits: number
  course_count: number
  courses: CourseSection[]
}

interface ScheduleVisualizationProps {
  scheduleData: {
    combinations: ScheduleCombination[]
    total_combinations: number
    selected_courses_count: number
  }
  onAddToFavorites?: (schedule: ScheduleCombination) => void
  onBackToSelection?: () => void
  showBackButton?: boolean
  favoritedCombinations?: Set<string>
}

const CANVAS_WIDTH = 1400
const CANVAS_HEIGHT = 900
const TOP_MARGIN = 0.15
const SIDE_MARGIN = 0.15
const MAJOR_LINE_WIDTH = 2
const MINOR_LINE_WIDTH = 1
const DAY_COUNT = 6 // Monday to Saturday

const weekDayStrings = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const weekDayChars = ["L", "M", "W", "J", "V", "S"]

// Mapping from Spanish day names to array indices
const dayNameToIndex: { [key: string]: number } = {
  "Lunes": 0,
  "Martes": 1, 
  "Miércoles": 2,
  "Jueves": 3,
  "Viernes": 4,
  "Sábado": 5,
  "Domingo": 6 // In case Sunday is used
}

// Modern color palette for courses
const courseColors = [
  { bg: 'rgba(99, 102, 241, 0.9)', text: '#fff', name: 'indigo' },
  { bg: 'rgba(16, 185, 129, 0.9)', text: '#fff', name: 'emerald' },
  { bg: 'rgba(245, 101, 101, 0.9)', text: '#fff', name: 'red' },
  { bg: 'rgba(139, 92, 246, 0.9)', text: '#fff', name: 'violet' },
  { bg: 'rgba(236, 72, 153, 0.9)', text: '#fff', name: 'pink' },
  { bg: 'rgba(34, 197, 94, 0.9)', text: '#fff', name: 'green' },
  { bg: 'rgba(249, 115, 22, 0.9)', text: '#fff', name: 'orange' },
  { bg: 'rgba(6, 182, 212, 0.9)', text: '#fff', name: 'cyan' },
]

export function ScheduleVisualization({ scheduleData, onAddToFavorites, onBackToSelection, showBackButton = false, favoritedCombinations = new Set() }: ScheduleVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentScheduleIndex, setCurrentScheduleIndex] = useState(0)
  const [startTime, setStartTime] = useState(7 * 60) // 7:00 AM in minutes
  const [endTime, setEndTime] = useState(22 * 60)   // 10:00 PM in minutes

  const { combinations, total_combinations } = scheduleData

  // Debug logging
  console.log('ScheduleVisualization received data:', scheduleData)
  console.log('Combinations:', combinations)
  console.log('Current schedule index:', currentScheduleIndex)

  useEffect(() => {
    drawSchedule(currentScheduleIndex)
  }, [currentScheduleIndex, combinations, startTime, endTime])

  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  const getTextColor = (bgColor: string): string => {
    const rgba = bgColor.match(/\d+/g)
    if (!rgba) return '#000'
    
    const [r, g, b] = rgba.map(Number)
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b)
    return brightness > 128 ? '#000000' : '#ffffff'
  }

  const drawSchedule = (scheduleIndex: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Fix blurry canvas on high-DPI displays
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    
    // Set the canvas size in CSS pixels
    canvas.style.width = CANVAS_WIDTH + 'px'
    canvas.style.height = CANVAS_HEIGHT + 'px'
    
    // Set the canvas size in actual pixels (accounting for device pixel ratio)
    canvas.width = CANVAS_WIDTH * dpr
    canvas.height = CANVAS_HEIGHT * dpr
    
    // Scale the context to account for device pixel ratio
    ctx.scale(dpr, dpr)
    
    // Enable anti-aliasing for smoother text and lines
    ctx.imageSmoothingEnabled = true
    ctx.textBaseline = 'top'

    const schedule = combinations[scheduleIndex]

    console.log('Drawing schedule:', schedule) // Debug log

    if (!schedule) {
      // Draw "No schedule" message with dark theme
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      
      ctx.fillStyle = '#f1f5f9'
      ctx.font = 'bold 28px "cascadia-code", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('No hay horarios disponibles', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
      
      ctx.font = '18px "cascadia-code", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      ctx.fillStyle = '#94a3b8'
      ctx.fillText('Intenta seleccionar más secciones o cambiar los filtros', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50)
      return
    }

    // Calculate dimensions
    const dayWidth = (CANVAS_WIDTH * (1 - SIDE_MARGIN)) / DAY_COUNT
    const hourCount = (endTime - startTime) / 60.0
    const hourHeight = (CANVAS_HEIGHT * (1 - TOP_MARGIN)) / hourCount
    const topMarginOffset = CANVAS_HEIGHT * TOP_MARGIN
    const sideMarginOffset = CANVAS_WIDTH * SIDE_MARGIN

    console.log('Canvas dimensions:', {
      CANVAS_WIDTH, CANVAS_HEIGHT, dayWidth, hourCount, hourHeight, 
      topMarginOffset, sideMarginOffset, startTime, endTime
    })

    // Validate dimensions
    if (!isFinite(dayWidth) || !isFinite(hourHeight) || hourHeight <= 0) {
      console.error('Invalid canvas dimensions')
      return
    }

    // Clear canvas with dark theme background
    ctx.fillStyle = '#0f172a' // Dark slate background to match theme
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw subtle outer border with dark theme colors
    ctx.lineWidth = 1
    ctx.strokeStyle = '#475569'
    ctx.beginPath()
    ctx.rect(0.5, 0.5, CANVAS_WIDTH - 1, CANVAS_HEIGHT - 1)
    ctx.stroke()

    // Draw side margin line
    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(sideMarginOffset, 0)
    ctx.lineTo(sideMarginOffset, CANVAS_HEIGHT)
    ctx.stroke()

    // Draw top margin line
    ctx.beginPath()
    ctx.moveTo(0, topMarginOffset)
    ctx.lineTo(CANVAS_WIDTH, topMarginOffset)
    ctx.stroke()

    // Draw title and info with dark theme styling
    ctx.fillStyle = '#f1f5f9'
    ctx.font = 'bold 32px "cascadia-code", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`Horario ${scheduleIndex + 1}`, 24, 28)
    
    ctx.font = 'semibold 18px "cascadia-code", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillStyle = '#a855f7'
    ctx.fillText(`${schedule.total_credits} créditos`, 24, 68)
    
    ctx.fillStyle = '#6366f1'
    ctx.fillText(`${schedule.courses.length} cursos`, 24, 92)

    // Draw day headers with dark theme styling
    ctx.fillStyle = '#f1f5f9'
    ctx.font = 'bold 20px "cascadia-code", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    for (let day = 0; day < DAY_COUNT; day++) {
      const xPos = sideMarginOffset + dayWidth * (day + 0.5)
      
      // Draw subtle header background
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(
        sideMarginOffset + dayWidth * day + 1, 
        1, 
        dayWidth - 2, 
        topMarginOffset - 2
      )
      
      // Draw day name
      ctx.fillStyle = '#f1f5f9'
      ctx.fillText(weekDayStrings[day], xPos, topMarginOffset - 35)
    }

    // Draw vertical day lines
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1
    for (let day = 1; day <= DAY_COUNT; day++) {
      const xPos = sideMarginOffset + dayWidth * day
      ctx.beginPath()
      ctx.moveTo(xPos, 0)
      ctx.lineTo(xPos, CANVAS_HEIGHT)
      ctx.stroke()
    }

    // Draw horizontal hour lines
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1
    ctx.font = '16px "cascadia-code", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'right'
    ctx.fillStyle = '#94a3b8'
    
    for (let hour = 0; hour <= hourCount; hour++) {
      const yPos = topMarginOffset + hourHeight * hour
      const timeMinutes = startTime + hour * 60
      
      if (hour > 0) {
        ctx.fillText(minutesToTime(timeMinutes - 60), sideMarginOffset - 12, yPos - 8)
      }
      
      ctx.beginPath()
      ctx.moveTo(0, yPos)
      ctx.lineTo(CANVAS_WIDTH, yPos)
      ctx.stroke()
    }

    // Draw courses with improved styling and debugging
    console.log('Drawing courses for schedule:', schedule.courses) // Debug log
    
    schedule.courses.forEach((courseSection, courseIndex) => {
      console.log(`Drawing course ${courseIndex}:`, courseSection) // Debug log
      
      if (!courseSection.sessions || courseSection.sessions.length === 0) {
        console.log(`No sessions for course ${courseSection.course_code}`)
        return
      }

      const color = courseColors[courseIndex % courseColors.length]
      
      courseSection.sessions.forEach((session, sessionIndex) => {
        console.log(`Drawing session ${sessionIndex}:`, session) // Debug log
        
        // Handle both string day names and numeric days
        let dayIndex: number
        if (typeof session.day === 'string') {
          // Backend is sending day as string name (e.g., "Miércoles")
          dayIndex = dayNameToIndex[session.day]
          if (dayIndex === undefined) {
            console.log(`Unknown day name: ${session.day}`)
            return
          }
        } else {
          // Backend is sending day as number (1=Monday, 2=Tuesday, etc.)
          dayIndex = session.day - 1
        }
        
        console.log(`Session day: ${session.day}, dayIndex: ${dayIndex}`) // Debug log
        
        if (dayIndex < 0 || dayIndex >= DAY_COUNT) {
          console.log(`Day ${session.day} is out of range`)
          return
        }

        const sessionStartMinutes = timeToMinutes(session.start_time)
        const sessionEndMinutes = timeToMinutes(session.end_time)
        
        console.log(`Session time: ${session.start_time} - ${session.end_time} (${sessionStartMinutes} - ${sessionEndMinutes} minutes)`)
        
        if (sessionStartMinutes < startTime || sessionEndMinutes > endTime) {
          console.log(`Session time is outside display range (${startTime} - ${endTime})`)
          return
        }

        const xPos = sideMarginOffset + dayWidth * dayIndex
        const yPos = topMarginOffset + (hourHeight * (sessionStartMinutes - startTime) / 60)
        const duration = (sessionEndMinutes - sessionStartMinutes) / 60
        const blockHeight = duration * hourHeight

        // Validate coordinates before drawing
        if (!isFinite(xPos) || !isFinite(yPos) || !isFinite(blockHeight) || blockHeight <= 0) {
          console.log(`Invalid coordinates: xPos=${xPos}, yPos=${yPos}, blockHeight=${blockHeight}`)
          return
        }

        console.log(`Drawing block at x:${xPos}, y:${yPos}, width:${dayWidth}, height:${blockHeight}`)

        // Draw subtle shadow first
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
        ctx.fillRect(xPos + 6, yPos + 4, dayWidth - 8, blockHeight - 6)

        // Draw course block with clean styling and rounded corners effect
        ctx.fillStyle = color.bg
        ctx.fillRect(xPos + 4, yPos + 2, dayWidth - 8, blockHeight - 4)

        // Draw subtle inner highlight for depth
        ctx.fillStyle = color.bg.replace('0.9', '0.7')
        ctx.fillRect(xPos + 4, yPos + 2, dayWidth - 8, 3)

        // Draw clean border
        ctx.strokeStyle = color.bg.replace('0.9', '1')
        ctx.lineWidth = 2
        ctx.strokeRect(xPos + 4, yPos + 2, dayWidth - 8, blockHeight - 4)

        // Draw course text with improved typography and proper fitting
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'left'
        
        const textX = xPos + 12
        const textY = yPos + 16
        const maxWidth = dayWidth - 24 // Leave padding on both sides
        
        // Helper function to draw text that fits in the available space
        const drawFittingText = (text: string, x: number, y: number, maxWidth: number, fontSize: number, fontWeight: string = 'normal') => {
          ctx.font = `${fontWeight} ${fontSize}px "cascadia-code", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
          
          // Measure text and truncate if needed
          let displayText = text
          const textWidth = ctx.measureText(displayText).width
          
          if (textWidth > maxWidth) {
            // Binary search for the right length
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
          return fontSize + 4 // Return height used
        }
        
        let currentY = textY
        
        // Course name (main title)
        const nameHeight = drawFittingText(courseSection.course_name, textX, currentY, maxWidth, 16, 'bold')
        currentY += nameHeight + 2
        
        // Course code and section
        const codeText = `${courseSection.course_code} - Sec. ${courseSection.section_number}`
        const codeHeight = drawFittingText(codeText, textX, currentY, maxWidth, 13, 'semibold')
        currentY += codeHeight + 2
        
        // Professor (if there's space)
        if (blockHeight > 65) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
          const professorHeight = drawFittingText(courseSection.professor, textX, currentY, maxWidth, 12)
          currentY += professorHeight + 2
        }
        
        // Time (if there's space)
        if (blockHeight > 85) {
          ctx.fillStyle = '#ffffff'
          const timeHeight = drawFittingText(`${session.start_time} - ${session.end_time}`, textX, currentY, maxWidth, 12, 'bold')
          currentY += timeHeight + 2
        }
        
        // Location (if there's space)
        if (session.location && blockHeight > 105) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
          const locationText = `📍 ${session.location}`
          drawFittingText(locationText, textX, currentY, maxWidth, 11)
        }
      })
    })
  }

  const downloadSchedule = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `horario_${currentScheduleIndex + 1}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const addToFavorites = () => {
    const currentSchedule = combinations[currentScheduleIndex]
    if (currentSchedule && onAddToFavorites) {
      onAddToFavorites(currentSchedule)
    }
  }

  const nextSchedule = () => {
    setCurrentScheduleIndex(prev => 
      prev < combinations.length - 1 ? prev + 1 : 0
    )
  }

  const prevSchedule = () => {
    setCurrentScheduleIndex(prev => 
      prev > 0 ? prev - 1 : combinations.length - 1
    )
  }

  if (!combinations || combinations.length === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Calendar className="w-5 h-5" />
            Horarios Generados
          </CardTitle>
          <CardDescription>No se encontraron combinaciones válidas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No hay horarios disponibles con las secciones seleccionadas.</p>
            <p className="text-sm mt-2">Intenta seleccionar más secciones o verifica que no haya conflictos de horario.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Button
                size="sm"
                variant="outline"
                onClick={onBackToSelection}
                className="border-border text-foreground hover:bg-muted"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Editar Cursos
              </Button>
            )}
            <div>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Calendar className="w-5 h-5" />
                Horarios Generados
              </CardTitle>
              <CardDescription>
                {total_combinations} combinaciones disponibles • {combinations[currentScheduleIndex]?.total_credits || 0} créditos
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={prevSchedule}
              disabled={combinations.length <= 1}
              className="border-border text-foreground hover:bg-muted"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 py-1 text-sm bg-muted rounded text-foreground">
              {currentScheduleIndex + 1} / {combinations.length}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={nextSchedule}
              disabled={combinations.length <= 1}
              className="border-border text-foreground hover:bg-muted"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={downloadSchedule}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0"
            >
              <Download className="w-4 h-4 mr-1" />
              Descargar
            </Button>
            {onAddToFavorites && (
              <Button
                size="sm"
                onClick={addToFavorites}
                variant={favoritedCombinations.has(combinations[currentScheduleIndex]?.combination_id) ? "default" : "outline"}
                className={
                  favoritedCombinations.has(combinations[currentScheduleIndex]?.combination_id)
                    ? "bg-pink-500 text-white hover:bg-pink-600 border-0"
                    : "border-pink-300 text-pink-600 hover:bg-pink-50 hover:text-pink-700"
                }
              >
                <Heart className={`w-4 h-4 mr-1 ${favoritedCombinations.has(combinations[currentScheduleIndex]?.combination_id) ? "fill-current" : ""}`} />
                {favoritedCombinations.has(combinations[currentScheduleIndex]?.combination_id) ? "Favorito" : "Agregar a Favoritos"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Schedule Canvas */}
          <div className="border border-border rounded-lg bg-slate-900 p-6 shadow-inner">
            <canvas
              ref={canvasRef}
              className="w-full h-auto max-w-full rounded-md shadow-sm"
              style={{ 
                maxHeight: '700px',
                backgroundColor: '#0f172a'
              }}
            />
          </div>

          {/* Course Legend */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {combinations[currentScheduleIndex]?.courses.map((courseSection, index) => {
              const color = courseColors[index % courseColors.length]
              return (
                <div key={`course-${courseSection.course_id}-${index}`} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/30">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: color.bg }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground">{courseSection.course_code}</div>
                    <div className="text-xs text-muted-foreground truncate">{courseSection.course_name}</div>
                    <div className="text-xs text-muted-foreground">{courseSection.credits} créditos</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time Settings */}
          <div className="flex items-center gap-4 p-3 border border-border rounded-lg bg-muted/30">
            <Clock className="w-4 h-4 text-muted-foreground" />
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
      </CardContent>
    </Card>
  )
}
