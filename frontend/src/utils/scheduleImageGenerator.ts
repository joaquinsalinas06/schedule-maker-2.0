// Use the specific types from ScheduleVisualization component
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

interface GenerateScheduleImageOptions {
  schedule: ScheduleCombination
  width?: number
  height?: number
  startTime?: number
  endTime?: number
  scheduleName?: string
  isFavorited?: boolean
  devicePixelRatio?: number
}

interface ScheduleImageResult {
  dataUrl: string
  width: number
  height: number
}

// Fixed dimensions for consistent high-quality images
const DEFAULT_WIDTH = 1400
const DEFAULT_HEIGHT = 900
const TOP_MARGIN = 0.15
const SIDE_MARGIN = 0.15
const DAY_COUNT = 6

const weekDayStrings = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

const dayNameToIndex: { [key: string]: number } = {
  "Monday": 0,
  "Tuesday": 1,
  "Wednesday": 2,
  "Thursday": 3,
  "Friday": 4,
  "Saturday": 5,
  "Sunday": 6
}

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

const timeToMinutes = (timeStr: string): number => {
  if (!timeStr || typeof timeStr !== 'string') {
    console.warn('Invalid time string:', timeStr)
    return 8 * 60
  }
  
  const parts = timeStr.split(':')
  if (parts.length < 2) {
    return 8 * 60
  }
  
  const [hours, minutes] = parts.map(Number)
  if (isNaN(hours) || isNaN(minutes)) {
    return 8 * 60
  }
  
  return hours * 60 + minutes
}

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

export const generateScheduleImage = ({
  schedule,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  startTime = 7 * 60,
  endTime = 22 * 60,
  scheduleName,
  isFavorited = false,
  devicePixelRatio = 2
}: GenerateScheduleImageOptions): Promise<ScheduleImageResult> => {
  return new Promise((resolve, reject) => {
    try {
      // Create offscreen canvas for high-quality rendering
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Could not get 2D context'))
        return
      }

      // Set canvas size with device pixel ratio for crisp rendering
      const dpr = devicePixelRatio
      canvas.width = width * dpr
      canvas.height = height * dpr
      
      // Scale context for high-DPI rendering
      ctx.scale(dpr, dpr)
      ctx.imageSmoothingEnabled = true
      ctx.textBaseline = 'top'

      // Calculate dimensions
      const dayWidth = (width * (1 - SIDE_MARGIN)) / DAY_COUNT
      const hourCount = (endTime - startTime) / 60.0
      const hourHeight = (height * (1 - TOP_MARGIN)) / hourCount
      const topMarginOffset = height * TOP_MARGIN
      const sideMarginOffset = width * SIDE_MARGIN

      // Font sizes optimized for image generation
      const fontSizes = {
        titleFont: 20,
        infoFont: 14,
        headerFont: 16,
        timeFont: 14,
        courseFont: 14,
        professorFont: 13,
        locationFont: 12,
      }

      // Clear canvas with dark theme background
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, width, height)

      // Draw outer border
      ctx.lineWidth = 1
      ctx.strokeStyle = '#475569'
      ctx.beginPath()
      ctx.rect(0.5, 0.5, width - 1, height - 1)
      ctx.stroke()

      // Draw side and top margin lines
      ctx.strokeStyle = '#64748b'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(sideMarginOffset, 0)
      ctx.lineTo(sideMarginOffset, height)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(0, topMarginOffset)
      ctx.lineTo(width, topMarginOffset)
      ctx.stroke()

      // Draw header info
      const headerAreaHeight = topMarginOffset
      const headerCenterY = headerAreaHeight / 2
      
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(1, 1, sideMarginOffset - 2, headerAreaHeight - 2)
      
      // Schedule title
      const displayName = scheduleName || `Horario Generado`
      ctx.fillStyle = '#f1f5f9'
      ctx.font = `bold ${fontSizes.titleFont}px system-ui, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(displayName, sideMarginOffset / 2, headerCenterY - 15)
      
      // Additional info
      const favoriteText = isFavorited ? " ★" : ""
      const courseCountText = `${schedule.courses?.length || 0} cursos${favoriteText}`
      
      ctx.font = `${fontSizes.infoFont}px system-ui, -apple-system, sans-serif`
      ctx.fillStyle = '#94a3b8'
      ctx.fillText(courseCountText, sideMarginOffset / 2, headerCenterY + 8)
      
      ctx.textBaseline = 'top'

      // Draw day headers
      ctx.fillStyle = '#f1f5f9'
      ctx.font = `bold ${fontSizes.headerFont}px system-ui, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      
      for (let day = 0; day < DAY_COUNT; day++) {
        const xPos = sideMarginOffset + dayWidth * (day + 0.5)
        
        ctx.fillStyle = '#1e293b'
        ctx.fillRect(sideMarginOffset + dayWidth * day + 1, 1, dayWidth - 2, headerAreaHeight - 2)
        
        ctx.fillStyle = '#f1f5f9'
        ctx.textBaseline = 'middle'
        ctx.fillText(weekDayStrings[day], xPos, headerCenterY)
        ctx.textBaseline = 'top'
      }

      // Draw grid lines
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 1
      
      // Vertical lines
      for (let day = 1; day <= DAY_COUNT; day++) {
        const xPos = sideMarginOffset + dayWidth * day
        ctx.beginPath()
        ctx.moveTo(xPos, 0)
        ctx.lineTo(xPos, height)
        ctx.stroke()
      }

      // Horizontal lines and time labels
      ctx.strokeStyle = '#1e293b'
      ctx.font = `${fontSizes.timeFont}px system-ui, -apple-system, sans-serif`
      ctx.textAlign = 'right'
      ctx.fillStyle = '#94a3b8'
      
      for (let hour = 0; hour <= hourCount; hour++) {
        const yPos = topMarginOffset + hourHeight * hour
        const timeMinutes = startTime + hour * 60
        
        if (hour < hourCount) {
          ctx.textBaseline = 'middle'
          const centerY = yPos + (hourHeight / 2)
          ctx.fillText(minutesToTime(timeMinutes), sideMarginOffset - 12, centerY)
          ctx.textBaseline = 'top'
        }
        
        ctx.beginPath()
        ctx.moveTo(0, yPos)
        ctx.lineTo(width, yPos)
        ctx.stroke()
      }

      // Process and draw course blocks
      const scheduleCourses = schedule.courses || []
      const dayBlocks: {[day: number]: {course: CourseSection, sessions: Session[], startY: number, height: number}[]} = {}

      // Collect sessions by day
      scheduleCourses.forEach((course) => {
        if (!course.sessions) return

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
          
          if (sessionStartMinutes < startTime || sessionEndMinutes > endTime) return

          const startY = topMarginOffset + (hourHeight * (sessionStartMinutes - startTime) / 60)
          const blockHeight = (sessionEndMinutes - sessionStartMinutes) * hourHeight / 60

          if (!dayBlocks[dayIndex]) {
            dayBlocks[dayIndex] = []
          }

          dayBlocks[dayIndex].push({
            course,
            sessions: [session],
            startY,
            height: blockHeight
          })
        })
      })

      // Draw course blocks
      Object.keys(dayBlocks).forEach((dayStr) => {
        const dayIndex = parseInt(dayStr)
        const blocks = dayBlocks[dayIndex]
        
        blocks.sort((a, b) => a.startY - b.startY)

        blocks.forEach((block) => {
          const course = block.course
          const session = block.sessions[0]
          
          const xPos = sideMarginOffset + dayWidth * dayIndex
          const yPos = block.startY
          const blockHeight = block.height
          const blockWidth = dayWidth
          
          if (!isFinite(xPos) || !isFinite(yPos) || !isFinite(blockHeight) || blockHeight <= 0) return

          const courseIndex = scheduleCourses.findIndex(c => c.course_code === course.course_code)
          const color = courseColors[courseIndex % courseColors.length]

          // Draw shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
          ctx.fillRect(xPos + 6, yPos + 4, blockWidth - 8, blockHeight - 6)

          // Draw main block
          ctx.fillStyle = color.bg
          ctx.fillRect(xPos + 4, yPos + 2, blockWidth - 8, blockHeight - 4)

          // Draw highlight
          ctx.fillStyle = color.bg.replace('0.9', '0.7')
          ctx.fillRect(xPos + 4, yPos + 2, blockWidth - 8, 3)

          // Draw border
          ctx.strokeStyle = color.bg.replace('0.9', '1')
          ctx.lineWidth = 2
          ctx.strokeRect(xPos + 4, yPos + 2, blockWidth - 8, blockHeight - 4)

          // Draw text content with better overflow protection
          ctx.fillStyle = '#ffffff'
          ctx.textAlign = 'left'
          const textX = xPos + 12
          const textY = yPos + 10  // Reduced from 16 to give more top margin
          const maxWidth = blockWidth - 24
          const maxTextHeight = blockHeight - 20  // Reserve space at bottom

          const drawFittingText = (text: string, x: number, y: number, maxWidth: number, fontSize: number, fontWeight: string = 'normal') => {
            ctx.font = `${fontWeight} ${fontSize}px system-ui, -apple-system, sans-serif`
            
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
            return fontSize + 4  // Reduced line spacing from 6 to 4
          }

          let currentY = textY
          
          // Course code - Always shown first
          ctx.fillStyle = '#ffffff'
          const codeHeight = drawFittingText(course.course_code, textX, currentY, maxWidth, fontSizes.courseFont + 1, 'bold')
          currentY += codeHeight
          
          // Course name - Show if we have space (most blocks should show this)
          if (currentY + fontSizes.courseFont + 2 < yPos + maxTextHeight) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
            const nameHeight = drawFittingText(course.course_name, textX, currentY, maxWidth, fontSizes.courseFont - 1, 'normal')
            currentY += nameHeight
          }
          
          // Section - Show if we have space (should fit in most 1h blocks)
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

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png', 1.0)
      
      resolve({
        dataUrl,
        width,
        height
      })
      
    } catch (error) {
      reject(error)
    }
  })
}

// Generate multiple schedule images for batching
export const generateScheduleImages = async (
  schedules: ScheduleCombination[],
  options: Omit<GenerateScheduleImageOptions, 'schedule'> = {}
): Promise<ScheduleImageResult[]> => {
  const images: ScheduleImageResult[] = []
  
  for (let i = 0; i < schedules.length; i++) {
    try {
      const result = await generateScheduleImage({
        ...options,
        schedule: schedules[i],
        scheduleName: options.scheduleName || `Horario ${i + 1}`
      })
      images.push(result)
    } catch (error) {
      console.error(`Failed to generate image for schedule ${i + 1}:`, error)
      // Continue with other schedules even if one fails
    }
  }
  
  return images
}