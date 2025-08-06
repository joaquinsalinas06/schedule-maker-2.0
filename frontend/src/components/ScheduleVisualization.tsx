"use client"

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Download, Calendar, Clock, Heart, ArrowLeft } from "lucide-react"
import { generateScheduleImage } from '@/utils/scheduleImageGenerator'

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
  professor: string
  sessions: Session[]
}

interface ScheduleCombination {
  combination_id: string
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
  onRemoveFromFavorites?: (combinationId: string) => void
  onBackToSelection?: () => void
  showBackButton?: boolean
  favoritedCombinations?: Set<string>
  scheduleName?: string
}

// Dynamic canvas dimensions that will be calculated based on container
let CANVAS_WIDTH = 1400
let CANVAS_HEIGHT = 900
let TOP_MARGIN = 0.15

const getResponsiveMargins = (containerWidth: number) => {
  if (containerWidth <= MOBILE_BREAKPOINT) {
    return {
      topMargin: 0.08,    // Much smaller top margin on mobile
      sideMargin: 0.12    // Slightly smaller side margin
    }
  } else if (containerWidth <= TABLET_BREAKPOINT) {
    return {
      topMargin: 0.10,    // Smaller top margin on tablet
      sideMargin: 0.13
    }
  } else {
    return {
      topMargin: 0.15,    // Original top margin on desktop
      sideMargin: 0.15
    }
  }
}

// Responsive breakpoints and aspect ratios
const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

const getResponsiveDimensions = (containerWidth: number) => {
  let width, height
  
  if (containerWidth <= MOBILE_BREAKPOINT) {
    // Mobile: More square aspect ratio for better fit
    width = Math.min(containerWidth - 32, 600) // 16px padding on each side
    height = Math.round(width * 0.75) // 4:3 aspect ratio
  } else if (containerWidth <= TABLET_BREAKPOINT) {
    // Tablet: Moderate aspect ratio
    width = Math.min(containerWidth - 48, 900)
    height = Math.round(width * 0.65) // Wider than mobile
  } else {
    // Desktop: Original wide aspect ratio
    width = Math.min(containerWidth - 64, 1400)
    height = Math.round(width * 0.64) // ~16:10 aspect ratio
  }
  
  return { width, height }
}

const getResponsiveFontSizes = (containerWidth: number) => {
  if (containerWidth <= MOBILE_BREAKPOINT) {
    return {
      titleFont: 12,      // "Horario #" - much smaller
      infoFont: 9,        // Credits and courses info - much smaller
      headerFont: 10,
      timeFont: 10,
      courseFont: 10,
      professorFont: 9,
      locationFont: 8,
      noScheduleTitle: 16,
      noScheduleSubtitle: 11
    }
  } else if (containerWidth <= TABLET_BREAKPOINT) {
    return {
      titleFont: 18,      // "Horario #" - much smaller
      infoFont: 14,       // Credits and courses info - much smaller
      headerFont: 12,
      timeFont: 12,
      courseFont: 12,
      professorFont: 11,
      locationFont: 10,
      noScheduleTitle: 20,
      noScheduleSubtitle: 13
    }
  } else {
    return {
      titleFont: 16,      // "Horario #" - much smaller (was 24)
      infoFont: 11,       // Credits and courses info - much smaller (was 14)
      headerFont: 13,
      timeFont: 13,
      courseFont: 13,
      professorFont: 12,
      locationFont: 11,
      noScheduleTitle: 24,
      noScheduleSubtitle: 16
    }
  }
}
const DAY_COUNT = 6 // Monday to Saturday

const weekDayStrings = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

// Mapping from Spanish day names to array indices
const dayNameToIndex: { [key: string]: number } = {
  // English day names (for CSV imports)
  "Monday": 0,
  "Tuesday": 1,
  "Wednesday": 2,
  "Thursday": 3,
  "Friday": 4,
  "Saturday": 5,
  "Sunday": 6
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

export function ScheduleVisualization({ scheduleData, onAddToFavorites, onRemoveFromFavorites, onBackToSelection, showBackButton = false, favoritedCombinations = new Set(), scheduleName }: ScheduleVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentScheduleIndex, setCurrentScheduleIndex] = useState(0)
  const [startTime, setStartTime] = useState(7 * 60) // 7:00 AM in minutes
  const [endTime, setEndTime] = useState(22 * 60)   // 10:00 PM in minutes
  const [containerWidth, setContainerWidth] = useState(1400)
  const [selectedCourse, setSelectedCourse] = useState<CourseSection | null>(null)
  const [clickableBlocks, setClickableBlocks] = useState<{course: CourseSection, x: number, y: number, width: number, height: number}[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [scheduleImages, setScheduleImages] = useState<{[key: number]: string}>({})
  const [imageLoading, setImageLoading] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null)

  const { combinations, total_combinations } = scheduleData

  // Calculate dynamic time limits based on actual schedule data
  const calculateTimeLimits = useCallback(() => {
    if (!combinations || combinations.length === 0) {
      return { minTime: 7 * 60, maxTime: 22 * 60 } // Default fallback
    }

    let earliestTime = 24 * 60 // Start with latest possible time
    let latestTime = 0 // Start with earliest possible time
    let hasValidTimes = false

    combinations.forEach(combination => {
      combination.courses?.forEach(course => {
        course.sessions?.forEach(session => {
          const startMinutes = timeToMinutes(session.start_time)
          const endMinutes = timeToMinutes(session.end_time)
          
          // Only consider valid times
          if (startMinutes >= 0 && endMinutes >= 0 && endMinutes > startMinutes) {
            hasValidTimes = true
            if (startMinutes < earliestTime) earliestTime = startMinutes
            if (endMinutes > latestTime) latestTime = endMinutes
          }
        })
      })
    })

    // If no valid times found, use default
    if (!hasValidTimes) {
      return { minTime: 7 * 60, maxTime: 22 * 60 }
    }

    // Add ±1 hour buffer
    const bufferHour = 60
    const minTime = Math.max(0, earliestTime - bufferHour) // Don't go below 0:00
    const maxTime = Math.min(24 * 60 - 1, latestTime + bufferHour) // Don't go above 23:59

    return { minTime, maxTime }
  }, [combinations])

  // Update time limits when schedule data changes
  useEffect(() => {
    const limits = calculateTimeLimits()
    setStartTime(limits.minTime)
    setEndTime(limits.maxTime)
  }, [calculateTimeLimits])

  // Handle container resize and detect mobile
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth
        setContainerWidth(width)
        const mobile = width <= MOBILE_BREAKPOINT
        setIsMobile(mobile)
        
        if (!mobile) {
          const dimensions = getResponsiveDimensions(width)
          CANVAS_WIDTH = dimensions.width
          CANVAS_HEIGHT = dimensions.height
        }
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    
    return () => {
      window.removeEventListener('resize', updateDimensions)
    }
  }, [])

  // Generate images for mobile when schedule data changes
  useEffect(() => {
    if (isMobile && combinations.length > 0) {
      generateImagesForMobile()
    }
  }, [isMobile, combinations, startTime, endTime, scheduleName, favoritedCombinations, currentScheduleIndex, scheduleImages])

  const generateImagesForMobile = async () => {
    if (!isMobile || combinations.length === 0) return
    
    setImageLoading(true)
    const newImages: {[key: number]: string} = {}
    
    try {
      // Generate images for current schedule and a few nearby ones for better UX
      const scheduleIndexesToGenerate = [
        currentScheduleIndex,
        Math.max(0, currentScheduleIndex - 1),
        Math.min(combinations.length - 1, currentScheduleIndex + 1)
      ].filter((index, pos, arr) => arr.indexOf(index) === pos) // Remove duplicates
      
      for (const index of scheduleIndexesToGenerate) {
        if (!scheduleImages[index]) {
          try {
            const result = await generateScheduleImage({
              schedule: combinations[index],
              width: 1400, // Fixed high-quality dimensions
              height: 900,
              startTime,
              endTime,
              scheduleName: scheduleName || `Horario ${index + 1}`,
              isFavorited: favoritedCombinations.has(combinations[index]?.combination_id),
              devicePixelRatio: 2
            })
            newImages[index] = result.dataUrl
          } catch (error) {
            console.error(`Failed to generate image for schedule ${index}:`, error)
          }
        }
      }
      
      setScheduleImages(prev => ({ ...prev, ...newImages }))
    } finally {
      setImageLoading(false)
    }
  }

  const drawSchedule = useCallback((scheduleIndex: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Reset clickable blocks
    const newClickableBlocks: {course: CourseSection, x: number, y: number, width: number, height: number}[] = []

    // Get responsive font sizes and margins
    const fontSizes = getResponsiveFontSizes(containerWidth)
    const margins = getResponsiveMargins(containerWidth)
    TOP_MARGIN = margins.topMargin

    // Fix blurry canvas on high-DPI displays
    const dpr = window.devicePixelRatio || 1
    
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


    if (!schedule) {
      // Draw "No schedule" message with dark theme
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      
      ctx.fillStyle = '#f1f5f9'
      ctx.font = `bold ${fontSizes.noScheduleTitle}px "cascadia-code", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText('No hay horarios disponibles', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
      
      ctx.font = `${fontSizes.noScheduleSubtitle}px "cascadia-code", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
      ctx.fillStyle = '#94a3b8'
      ctx.fillText('Intenta seleccionar más secciones o cambiar los filtros', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40)
      return
    }

    // Calculate dimensions
    const dayWidth = (CANVAS_WIDTH * (1 - margins.sideMargin)) / DAY_COUNT
    const hourCount = (endTime - startTime) / 60.0
    const hourHeight = (CANVAS_HEIGHT * (1 - TOP_MARGIN)) / hourCount
    const topMarginOffset = CANVAS_HEIGHT * TOP_MARGIN
    const sideMarginOffset = CANVAS_WIDTH * margins.sideMargin


    // Validate dimensions
    if (!isFinite(dayWidth) || !isFinite(hourHeight) || hourHeight <= 0) {
      // Invalid canvas dimensions
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

    // Draw header info styled exactly like day headers
    const headerAreaHeight = topMarginOffset
    const headerCenterY = headerAreaHeight / 2
    
    // Create header background exactly like day headers
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(1, 1, sideMarginOffset - 2, headerAreaHeight - 2)
    
    // Display schedule name (if provided) or default format  
    const displayName = scheduleName || `Horario ${scheduleIndex + 1}`
    
    // Header title
    ctx.fillStyle = '#f1f5f9' // Light text on dark background
    ctx.font = `bold ${fontSizes.titleFont}px "cascadia-code", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle' // Center vertically in the header area
    ctx.fillText(displayName, sideMarginOffset / 2, headerCenterY - 15)
    
    // Additional info on same line
    const isCurrentlyFavorited = favoritedCombinations.has(schedule.combination_id.toString())
    const favoriteText = isCurrentlyFavorited ? " ★" : ""
    const courseCountText = `${schedule.course_count || schedule.courses?.length || 0} cursos${favoriteText}`
    
    ctx.font = `${fontSizes.infoFont}px "cascadia-code", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    ctx.fillStyle = '#94a3b8' // Muted light text
    ctx.fillText(courseCountText, sideMarginOffset / 2, headerCenterY + 5)
    
    // Reset text baseline
    ctx.textBaseline = 'top'
    
    // Draw day headers
    ctx.fillStyle = '#f1f5f9'
    ctx.font = `bold ${fontSizes.headerFont}px "cascadia-code", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    ctx.textAlign = 'center'
    for (let day = 0; day < DAY_COUNT; day++) {
      const xPos = sideMarginOffset + dayWidth * (day + 0.5)
      
      // Header background with same styling
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(sideMarginOffset + dayWidth * day + 1, 1, dayWidth - 2, headerAreaHeight - 2)
      
      // Day name
      ctx.fillStyle = '#f1f5f9'
      ctx.textBaseline = 'middle' 
      ctx.fillText(weekDayStrings[day], xPos, headerCenterY)
      ctx.textBaseline = 'top'
    }

    // Draw grid lines
    ctx.strokeStyle = '#334155' // Darker grid lines for dark theme
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
    ctx.strokeStyle = '#1e293b' // Even darker horizontal lines
    ctx.font = `${fontSizes.timeFont}px "cascadia-code", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    ctx.textAlign = 'right'
    ctx.fillStyle = '#94a3b8' // Muted light text for time labels
    
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

    // Process schedule data
    const scheduleCourses = schedule.courses || []

    // Group courses by position in the day and check for overlaps
    const dayBlocks: {[day: number]: {course: CourseSection, sessions: Session[], startY: number, height: number}[]} = {}

    // First, collect all course sessions by day
    scheduleCourses.forEach((course) => {
      if (!course.sessions || course.sessions.length === 0) return

      course.sessions.forEach((session) => {
        let dayIndex: number
        if (typeof session.day === 'string') {
          dayIndex = dayNameToIndex[session.day]
          if (dayIndex === undefined) return
        } else {
          dayIndex = (session.day as number) - 1
        }

        if (dayIndex < 0 || dayIndex >= DAY_COUNT) return

        const sessionStartMinutes = timeToMinutes(session.start_time)
        const sessionEndMinutes = timeToMinutes(session.end_time)
        
        // Skip sessions outside our time range
        if (sessionStartMinutes < startTime || sessionEndMinutes > endTime) return

        const startY = topMarginOffset + (hourHeight * (sessionStartMinutes - startTime) / 60)
        const height = (sessionEndMinutes - sessionStartMinutes) * hourHeight / 60

        if (!dayBlocks[dayIndex]) {
          dayBlocks[dayIndex] = []
        }

        dayBlocks[dayIndex].push({
          course,
          sessions: [session],
          startY,
          height
        })
      })
    })

    // Draw course blocks for each day
    Object.keys(dayBlocks).forEach((dayStr) => {
      const dayIndex = parseInt(dayStr)
      const blocks = dayBlocks[dayIndex]
      
      // Sort blocks by start time
      blocks.sort((a, b) => a.startY - b.startY)

      blocks.forEach((block) => {
        const course = block.course
        const sessions = block.sessions
        const session = sessions[0] // We have one session per block in this structure

        // Calculate position
        const xPos = sideMarginOffset + dayWidth * dayIndex
        const yPos = block.startY
        const blockHeight = block.height
        const blockWidth = dayWidth
        
        // Validate coordinates
        if (!isFinite(xPos) || !isFinite(yPos) || !isFinite(blockHeight) || blockHeight <= 0) return

        // Get course color
        const courseIndex = scheduleCourses.findIndex(c => c.course_code === course.course_code)
        const color = courseColors[courseIndex % courseColors.length]

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
        ctx.fillRect(xPos + 6, yPos + 4, blockWidth - 8, blockHeight - 6)

        // Draw main course block with vibrant color
        ctx.fillStyle = color.bg
        ctx.fillRect(xPos + 4, yPos + 2, blockWidth - 8, blockHeight - 4)

        // Draw subtle inner highlight for depth
        ctx.fillStyle = color.bg.replace('0.9', '0.7')
        ctx.fillRect(xPos + 4, yPos + 2, blockWidth - 8, 3)

        // Draw clean border
        ctx.strokeStyle = color.bg.replace('0.9', '1')
        ctx.lineWidth = 2
        ctx.strokeRect(xPos + 4, yPos + 2, blockWidth - 8, blockHeight - 4)

        // Store clickable block info
        newClickableBlocks.push({
          course,
          x: xPos + 4,
          y: yPos + 2,
          width: blockWidth - 8,
          height: blockHeight - 4
        })

        // Draw course info text with improved typography and overflow protection
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'left'
        const textX = xPos + 12
        const textY = yPos + 10  // Reduced from 16 to give more top margin
        const maxWidth = blockWidth - 24
        const maxTextHeight = blockHeight - 20  // Reserve space at bottom

        // Helper function for fitting text with proper styling
        const drawFittingText = (text: string, x: number, y: number, maxWidth: number, fontSize: number, fontWeight: string = 'normal') => {
          ctx.font = `${fontWeight} ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
          
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
          return fontSize + 4 // Reduced line spacing from 6 to 4
        }

        let currentY = textY
        
        // Course code - Always shown first, compact
        ctx.fillStyle = '#ffffff'
        const codeHeight = drawFittingText(course.course_code, textX, currentY, maxWidth, fontSizes.courseFont + 1, 'bold')
        currentY += codeHeight
        
        // Course name - Show if we have space (most blocks should show this)
        if (currentY + fontSizes.courseFont + 2 < yPos + maxTextHeight) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
          const nameHeight = drawFittingText(course.course_name, textX, currentY, maxWidth, fontSizes.courseFont - 1, 'normal')
          currentY += nameHeight
        }
        
        // Section number - Show if we have space (should fit in most 1h blocks)
        if (currentY + fontSizes.courseFont + 2 < yPos + maxTextHeight) {
          const sectionText = `Sección ${course.section_number}`
          const sectionHeight = drawFittingText(sectionText, textX, currentY, maxWidth, fontSizes.courseFont - 2, 'normal')
          currentY += sectionHeight
        }
        
        // Professor - show if we have space
        if (currentY + fontSizes.professorFont + 2 < yPos + maxTextHeight) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
          const professorHeight = drawFittingText(course.professor, textX, currentY, maxWidth, fontSizes.professorFont)
          currentY += professorHeight
        }
        
        // Time - show if we have space and block is reasonably tall
        if (blockHeight > 50 && currentY + fontSizes.timeFont + 2 < yPos + maxTextHeight) {
          ctx.fillStyle = '#ffffff'
          const timeHeight = drawFittingText(`${session.start_time} - ${session.end_time}`, textX, currentY, maxWidth, fontSizes.timeFont - 1, 'bold')
          currentY += timeHeight
        }
        
        // Location - show if we have space and block is tall
        if (session.location && blockHeight > 65 && currentY + fontSizes.locationFont + 2 < yPos + maxTextHeight) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
          const locationText = `📍 ${session.location}`
          drawFittingText(locationText, textX, currentY, maxWidth, fontSizes.locationFont)
        }
      })
    })

    // Update clickable blocks - make sure component is still mounted
    if (canvasRef.current) {
      setClickableBlocks(newClickableBlocks)
    }
  }, [combinations, startTime, endTime, containerWidth, favoritedCombinations, scheduleName])

  useEffect(() => {
    const dimensions = getResponsiveDimensions(containerWidth)
    CANVAS_WIDTH = dimensions.width
    CANVAS_HEIGHT = dimensions.height
    drawSchedule(currentScheduleIndex)
  }, [currentScheduleIndex, drawSchedule, containerWidth])

  // Add canvas click handler
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleCanvasClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      // Scale coordinates to match canvas coordinate system (account for device pixel ratio)
      const dpr = window.devicePixelRatio || 1
      const scaleX = (canvas.width / dpr) / rect.width
      const scaleY = (canvas.height / dpr) / rect.height
      
      const scaledX = x * scaleX
      const scaledY = y * scaleY

      // Find clicked course block
      const clickedBlock = clickableBlocks.find(block => 
        scaledX >= block.x && scaledX <= block.x + block.width &&
        scaledY >= block.y && scaledY <= block.y + block.height
      )

      if (clickedBlock) {
        setSelectedCourse(clickedBlock.course)
      }
    }

    const handleCanvasMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      // Scale coordinates to match canvas coordinate system (account for device pixel ratio)
      const dpr = window.devicePixelRatio || 1
      const scaleX = (canvas.width / dpr) / rect.width
      const scaleY = (canvas.height / dpr) / rect.height
      
      const scaledX = x * scaleX
      const scaledY = y * scaleY

      // Check if hovering over a course block
      const hoveredBlock = clickableBlocks.find(block => 
        scaledX >= block.x && scaledX <= block.x + block.width &&
        scaledY >= block.y && scaledY <= block.y + block.height
      )

      canvas.style.cursor = hoveredBlock ? 'pointer' : 'default'
    }

    canvas.addEventListener('click', handleCanvasClick)
    canvas.addEventListener('mousemove', handleCanvasMouseMove)

    return () => {
      canvas.removeEventListener('click', handleCanvasClick)
      canvas.removeEventListener('mousemove', handleCanvasMouseMove)
    }
  }, [clickableBlocks])

  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr || typeof timeStr !== 'string') {
      console.warn('Invalid time string:', timeStr)
      return 8 * 60 // Default to 8:00 AM
    }
    
    const parts = timeStr.split(':')
    if (parts.length < 2 || parts.length > 3) {
      console.warn('Invalid time format:', timeStr)
      return 8 * 60 // Default to 8:00 AM
    }
    
    const [hours, minutes] = parts.map(Number)
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours >= 24 || minutes < 0 || minutes >= 60) {
      console.warn('Invalid time values:', timeStr)
      return 8 * 60 // Default to 8:00 AM
    }
    
    return hours * 60 + minutes
  }

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }



  const downloadSchedule = async () => {
    if (isMobile) {
      // For mobile, generate a high-quality image and download it
      try {
        const currentSchedule = combinations[currentScheduleIndex]
        if (!currentSchedule) return
        
        const result = await generateScheduleImage({
          schedule: currentSchedule,
          width: 1400,
          height: 900,
          startTime,
          endTime,
          scheduleName: scheduleName || `Horario ${currentScheduleIndex + 1}`,
          isFavorited: favoritedCombinations.has(currentSchedule.combination_id),
          devicePixelRatio: 2
        })
        
        const link = document.createElement('a')
        link.download = `horario_${currentScheduleIndex + 1}.png`
        link.href = result.dataUrl
        link.click()
      } catch (error) {
        console.error('Failed to generate download image:', error)
      }
    } else {
      // For desktop, use canvas as before
      const canvas = canvasRef.current
      if (!canvas) return

      const link = document.createElement('a')
      link.download = `horario_${currentScheduleIndex + 1}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
  }

  const toggleFavorite = () => {
    const currentSchedule = combinations[currentScheduleIndex]
    if (!currentSchedule) return
    
    const isFavorited = favoritedCombinations.has(currentSchedule.combination_id)
    
    if (isFavorited && onRemoveFromFavorites) {
      onRemoveFromFavorites(currentSchedule.combination_id)
    } else if (!isFavorited && onAddToFavorites) {
      onAddToFavorites(currentSchedule)
    }
  }

  const nextSchedule = () => {
    setCurrentScheduleIndex(prev => {
      const newIndex = prev < combinations.length - 1 ? prev + 1 : 0
      // Pre-generate image for mobile if needed
      if (isMobile && !scheduleImages[newIndex]) {
        generateImageForIndex(newIndex)
      }
      return newIndex
    })
  }

  const prevSchedule = () => {
    setCurrentScheduleIndex(prev => {
      const newIndex = prev > 0 ? prev - 1 : combinations.length - 1
      // Pre-generate image for mobile if needed
      if (isMobile && !scheduleImages[newIndex]) {
        generateImageForIndex(newIndex)
      }
      return newIndex
    })
  }

  const generateImageForIndex = async (index: number) => {
    if (index < 0 || index >= combinations.length || scheduleImages[index]) return
    
    try {
      const result = await generateScheduleImage({
        schedule: combinations[index],
        width: 1400,
        height: 900,
        startTime,
        endTime,
        scheduleName: scheduleName || `Horario ${index + 1}`,
        isFavorited: favoritedCombinations.has(combinations[index]?.combination_id),
        devicePixelRatio: 2
      })
      setScheduleImages(prev => ({ ...prev, [index]: result.dataUrl }))
    } catch (error) {
      console.error(`Failed to generate image for index ${index}:`, error)
    }
  }

  if (!combinations || combinations.length === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Calendar className="w-5 h-5" />
            {scheduleName || "Horarios Generados"}
          </CardTitle>
          <CardDescription>
            {scheduleName ? "No hay datos de horario disponibles" : "No se encontraron combinaciones válidas"}
          </CardDescription>
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
    <>
    <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
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
                {scheduleName || "Horarios Generados"}
              </CardTitle>
              <CardDescription>
                {scheduleName ? 
                  `Horario Compartido • ${combinations[currentScheduleIndex]?.courses.length || 0} cursos` :
                  `${total_combinations} combinaciones disponibles • ${combinations[currentScheduleIndex]?.courses.length || 0} cursos`
                }
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            {(onAddToFavorites || onRemoveFromFavorites) && (
              <Button
                size="sm"
                onClick={toggleFavorite}
                variant={favoritedCombinations.has(combinations[currentScheduleIndex]?.combination_id) ? "default" : "outline"}
                className={
                  favoritedCombinations.has(combinations[currentScheduleIndex]?.combination_id)
                    ? "bg-pink-500 text-white hover:bg-pink-600 border-0"
                    : "border-pink-500/50 text-pink-400 hover:bg-pink-500/20 hover:text-pink-300"
                }
              >
                <Heart className={`w-4 h-4 mr-1 ${favoritedCombinations.has(combinations[currentScheduleIndex]?.combination_id) ? "fill-current" : ""}`} />
                {favoritedCombinations.has(combinations[currentScheduleIndex]?.combination_id) ? "Quitar de Favoritos" : "Agregar a Favoritos"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Schedule Display - Canvas for Desktop, Image for Mobile */}
          <div ref={containerRef} className={`border border-border rounded-lg bg-slate-900 shadow-inner ${
            isMobile ? 'p-0 overflow-hidden' : 'p-6'
          }`}>
            {isMobile ? (
              // Mobile: Show generated image fitting container exactly
              <div className="w-full flex items-center justify-center relative">
                {imageLoading && !scheduleImages[currentScheduleIndex] ? (
                  <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm">Generando horario...</p>
                  </div>
                ) : scheduleImages[currentScheduleIndex] ? (
                  <div 
                    className="w-full max-w-full overflow-hidden rounded-md cursor-pointer hover:opacity-90 transition-opacity relative"
                    onClick={() => {
                      setModalImageUrl(scheduleImages[currentScheduleIndex])
                      setIsImageModalOpen(true)
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={scheduleImages[currentScheduleIndex]}
                      alt={`Horario ${currentScheduleIndex + 1}`}
                      className="w-full h-auto max-w-full block"
                      style={{ 
                        backgroundColor: '#0f172a',
                        borderRadius: '0.5rem'
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/10">
                      <div className="bg-black/80 text-white px-3 py-2 rounded-lg text-sm font-medium">
                        Toca para expandir
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground p-8">
                    <Calendar className="w-12 h-12 opacity-50" />
                    <p className="text-sm text-center">No se pudo generar la imagen del horario</p>
                    <Button 
                      onClick={() => generateImageForIndex(currentScheduleIndex)}
                      variant="outline"
                      size="sm"
                    >
                      Reintentar
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              // Desktop: Show interactive canvas
              <canvas
                ref={canvasRef}
                className="w-full h-auto max-w-full rounded-md shadow-sm"
                style={{ 
                  backgroundColor: '#0f172a'
                }}
              />
            )}
          </div>

          {/* Course Legend - Only show interactive course details on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {combinations[currentScheduleIndex]?.courses.map((courseSection, index) => {
              const color = courseColors[index % courseColors.length]
              return (
                <div 
                  key={`course-${courseSection.course_id}-${index}`} 
                  className={`flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/30 ${
                    !isMobile ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''
                  }`}
                  onClick={() => !isMobile && setSelectedCourse(courseSection)}
                >
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: color.bg }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground">{courseSection.course_code}</div>
                    <div className="text-xs text-muted-foreground truncate">{courseSection.course_name}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time Settings */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 border border-border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground font-medium">Horario:</span>
            </div>
            <div className="flex flex-row gap-3 sm:gap-4">
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

    {/* Full-Screen Image Modal for Mobile */}
    {isImageModalOpen && modalImageUrl && (
      <div 
        className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
        onClick={() => setIsImageModalOpen(false)}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <div 
          className="relative max-w-full max-h-full overflow-auto"
          style={{
            /* Enable smooth scrolling and momentum on touch devices */
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={modalImageUrl}
            alt={`Horario ${currentScheduleIndex + 1} - Vista expandida`}
            className="max-w-none w-auto h-auto"
            style={{
              maxWidth: '95vw',
              maxHeight: '95vh',
              objectFit: 'contain',
              /* Enable pinch-to-zoom on mobile browsers */
              touchAction: 'pan-x pan-y zoom-in'
            }}
          />
          
          {/* Close button */}
          <button
            onClick={() => setIsImageModalOpen(false)}
            className="absolute top-4 right-4 bg-black/80 text-white rounded-full p-3 hover:bg-black/90 transition-colors z-10"
            aria-label="Cerrar vista expandida"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Download button in modal */}
          <button
            onClick={downloadSchedule}
            className="absolute bottom-4 right-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-4 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            <span className="font-medium">Descargar</span>
          </button>
          
          {/* Info overlay */}
          <div className="absolute top-4 left-4 bg-black/80 text-white px-4 py-2 rounded-lg">
            <div className="text-sm font-medium">
              {scheduleName || `Horario ${currentScheduleIndex + 1}`}
            </div>
            <div className="text-xs text-gray-300">
              {combinations[currentScheduleIndex]?.courses.length || 0} cursos • Pellizca para hacer zoom
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Course Details Modal - Outside Card for full screen coverage */}
    {selectedCourse && (
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999]"
        onClick={() => setSelectedCourse(null)}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <div 
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 mx-4 shadow-2xl transform transition-all duration-300 scale-100"
          onClick={(e) => e.stopPropagation()}
          style={{ width: '480px', maxWidth: '90vw' }}
        >
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              {selectedCourse.course_name}
            </h3>
            <button
              onClick={() => setSelectedCourse(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold transition-colors duration-200"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-4 text-base">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Código:</span>
                  <div className="text-gray-900 dark:text-white font-mono">{selectedCourse.course_code}</div>
                </div>
                
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Sección:</span>
                  <div className="text-gray-900 dark:text-white font-mono">{selectedCourse.section_number}</div>
                </div>
              </div>
              
              <div className="mt-4">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Profesor:</span>
                <div className="text-gray-900 dark:text-white">{selectedCourse.professor}</div>
              </div>
            </div>
            
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-300 text-lg">Horarios:</span>
              <div className="mt-2 space-y-3">
                {selectedCourse.sessions?.map((session, index) => {
                  // Spanish day names mapping
                  const spanishDayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                  const englishToSpanishDays: { [key: string]: string } = {
                    'Sunday': 'Domingo',
                    'Monday': 'Lunes', 
                    'Tuesday': 'Martes',
                    'Wednesday': 'Miércoles',
                    'Thursday': 'Jueves',
                    'Friday': 'Viernes',
                    'Saturday': 'Sábado'
                  };
                  
                  let dayName = 'N/A';
                  if (typeof session.day === 'string') {
                    // If it's already a string, check if it's English and translate
                    dayName = englishToSpanishDays[session.day] || session.day;
                  } else if (typeof session.day === 'number') {
                    // If it's a number, use Spanish day names
                    dayName = spanishDayNames[session.day] || 'N/A';
                  }
                  
                  return (
                    <div key={index} className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <strong className="text-blue-700 dark:text-blue-300 text-lg">{dayName}</strong>
                        <span className="text-gray-900 dark:text-white font-mono font-semibold">
                          {session.start_time} - {session.end_time}
                        </span>
                      </div>
                      {session.location && (
                        <div className="text-gray-600 dark:text-gray-400 mt-1 flex items-center">
                          <span className="mr-1">📍</span> {session.location}
                        </div>
                      )}
                      {session.modality && (
                        <div className="text-gray-600 dark:text-gray-400 mt-1 flex items-center">
                          <span className="mr-1">💻</span> {session.modality}
                        </div>
                      )}
                    </div>
                  )
                }) || <span className="text-gray-500 dark:text-gray-400">No hay horarios disponibles</span>}
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={() => setSelectedCourse(null)}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg text-base font-semibold transition-all duration-200 transform hover:scale-105"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
