"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { apiService } from "@/services/api"
import { SecureStorage } from "@/utils/secureStorage"
import { 
  Course, 
  SelectedSection, 
  ScheduleResponse,
  SectionPopupState,
  GroupedCourse,
  ScheduleFilters,
  FavoriteSchedule,
  Session as TypesSession,
  ScheduleCombination as TypesScheduleCombination,
  CourseSection
} from "@/types"
import { ScheduleVisualization } from "@/components/ScheduleVisualization"

// Dashboard Components
import { SelectedSectionsCard } from '@/components/dashboard/SelectedSectionsCard'
import { SectionSelectionPopup } from '@/components/dashboard/SectionSelectionPopup'

// Local types that match ScheduleVisualization expectations
interface VisualizationSession {
  session_id: number
  session_type: string
  day: string | number
  start_time: string
  end_time: string
  location: string
  modality: string
}

interface VisualizationCourseSection {
  course_id: number
  course_code: string
  course_name: string
  section_id: number
  section_number: string
  professor: string
  sessions: VisualizationSession[]
}

export default function SchedulesPage() {
  const router = useRouter()
  
  const [selectedSections, setSelectedSections] = useState<SelectedSection[]>([])
  const [generatedSchedules, setGeneratedSchedules] = useState<ScheduleResponse | null>(null)
  const [viewingFavoriteSchedule, setViewingFavoriteSchedule] = useState<FavoriteSchedule | null>(null)
  const [sectionPopup, setSectionPopup] = useState<SectionPopupState | null>(null)
  const [, setIsLoading] = useState(false)
  const [collapsedCourses, setCollapsedCourses] = useState<Set<string>>(new Set())
  
  // Search states for the compact search
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState("")
  const [scheduleSearchResults, setScheduleSearchResults] = useState<Course[]>([])
  const [scheduleSearchLoading, setScheduleSearchLoading] = useState(false)
  const [scheduleFilters, setScheduleFilters] = useState<ScheduleFilters>({
    department: "",
  })
  
  // Favorite schedule management states
  const [favoriteSchedules, setFavoriteSchedules] = useState<FavoriteSchedule[]>([])
  const [favoritedCombinations, setFavoritedCombinations] = useState<Set<string>>(new Set())

  // Load data from sessionStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSchedules = sessionStorage.getItem('generatedSchedules')
      const savedSelectedSections = sessionStorage.getItem('selectedSections')
      const savedFavorites = SecureStorage.getItem('favoriteSchedules') // 🔒 User-specific
      const savedCombinations = SecureStorage.getItem('favoritedCombinations') // 🔒 User-specific
      const viewingFavorite = sessionStorage.getItem('viewingFavoriteSchedule')
      
      if (savedSchedules) {
        try {
          const parsedSchedules = JSON.parse(savedSchedules)
          setGeneratedSchedules(parsedSchedules)
        } catch (error) {
          // Error loading saved schedules
        }
      }
      
      if (savedSelectedSections) {
        try {
          setSelectedSections(JSON.parse(savedSelectedSections))
        } catch {
          // Error loading saved sections
        }
      }
      
      if (savedFavorites) {
        try {
          setFavoriteSchedules(JSON.parse(savedFavorites))
        } catch {
          // Error loading saved favorites
        }
      }
      
      if (savedCombinations) {
        try {
          const combinations = JSON.parse(savedCombinations)
          setFavoritedCombinations(new Set(combinations))
        } catch {
          // Error loading saved combinations
        }
      }
      
      // Handle viewing favorite schedule from my-schedules
      if (viewingFavorite) {
        try {
          const parsedFavorite = JSON.parse(viewingFavorite)
          setViewingFavoriteSchedule(parsedFavorite)
          // Clear it after loading so it doesn't persist on refresh
          sessionStorage.removeItem('viewingFavoriteSchedule')
        } catch (error) {
          // Error loading viewing favorite
        }
      }
    }
  }, [])

  // Helper function to group sections by course
  const groupSectionsByCourse = (): GroupedCourse[] => {
    const grouped = selectedSections.reduce((acc, section, index) => {
      const courseCode = section.courseCode
      if (!acc[courseCode]) {
        acc[courseCode] = {
          courseName: section.courseName,
          courseCode: section.courseCode,
          sections: []
        }
      }
      acc[courseCode].sections.push({ ...section, index })
      return acc
    }, {} as Record<string, GroupedCourse>)
    
    return Object.values(grouped)
  }

  // Toggle collapse for a course
  const toggleCourseCollapse = (courseCode: string) => {
    const newCollapsed = new Set(collapsedCourses)
    if (newCollapsed.has(courseCode)) {
      newCollapsed.delete(courseCode)
    } else {
      newCollapsed.add(courseCode)
    }
    setCollapsedCourses(newCollapsed)
  }

  // Separate search function for schedules view
  const handleScheduleSearch = async () => {
    if (!scheduleSearchQuery.trim()) {
      setScheduleSearchResults([])
      return
    }
    
    setScheduleSearchLoading(true)
    try {
      const response = await apiService.searchCourses(
        scheduleSearchQuery.trim(),
        "UTEC",
        scheduleFilters.department || undefined,
        undefined,
        20
      )
      setScheduleSearchResults(response || [])
    } catch {
      setScheduleSearchResults([])
    } finally {
      setScheduleSearchLoading(false)
    }
  }

  const addSection = (course: Course, sectionId: number) => {
    const section = course.sections.find(s => s.id === sectionId)
    if (!section) return

    const newSelection: SelectedSection = {
      sectionId: section.id,
      courseCode: course.code,
      courseName: course.name,
      sectionCode: section.section_number,
      professor: section.professor,
      sessions: section.sessions,
    }
    
    const newSections = [...selectedSections, newSelection]
    setSelectedSections(newSections)
    
    // Update sessionStorage
    sessionStorage.setItem('selectedSections', JSON.stringify(newSections))
  }

  const removeSection = (index: number) => {
    const newSections = selectedSections.filter((_, i) => i !== index)
    setSelectedSections(newSections)
    
    // Update sessionStorage
    sessionStorage.setItem('selectedSections', JSON.stringify(newSections))
  }

  const handleGenerateSchedules = async () => {
    if (selectedSections.length === 0) return

    setIsLoading(true)
    try {
      const request = {
        selected_sections: selectedSections.map(s => s.sectionId)
      }
      
      const response = await apiService.generateSchedules(request)
      setGeneratedSchedules(response.data)
      setViewingFavoriteSchedule(null) // Clear any favorite being viewed
      
      // Update sessionStorage
      sessionStorage.setItem('generatedSchedules', JSON.stringify(response.data))
    } catch (error) {
      console.error('Error generating schedules:', error)
      // Handle auth errors through the axios interceptor
    } finally {
      setIsLoading(false)
    }
  }

  // Wrapper to convert ScheduleVisualization's ScheduleCombination to our type
  const addToFavoritesWrapper = (schedule: { combination_id: string; course_count: number; courses: unknown[] }) => {
    const typedSchedule: TypesScheduleCombination = {
      combination_id: schedule.combination_id,
      sections: [],
      conflicts: [],
      course_count: schedule.course_count,
      courses: schedule.courses as unknown as CourseSection[]
    }
    addToFavorites(typedSchedule)
  }

  // Favorite schedule management
  const addToFavorites = (schedule: TypesScheduleCombination) => {
    const favoriteId = `fav_${Date.now()}`
    const newFavorite: FavoriteSchedule = {
      id: favoriteId,
      name: `Horario ${favoriteSchedules.length + 1}`,
      combination: schedule,
      created_at: new Date().toISOString(),
      notes: ''
    }
    setFavoriteSchedules(prev => [...prev, newFavorite])
    // Handle both favorite schedule format and regular schedule format
    const combinationId = schedule.combination_id
    setFavoritedCombinations(prev => new Set([...prev, combinationId.toString()]))
    
    // Store in localStorage for persistence
    const updatedFavorites = [...favoriteSchedules, newFavorite]
    SecureStorage.setItem('favoriteSchedules', JSON.stringify(updatedFavorites)) // 🔒 User-specific
    SecureStorage.setItem('favoritedCombinations', JSON.stringify([...favoritedCombinations, combinationId.toString()])) // 🔒 User-specific
  }

  const removeFromFavoritesByCombinationId = (combinationId: string) => {
    // Find the favorite by combination_id instead of by id
    const favorite = favoriteSchedules.find(fav => 
      fav.combination.combination_id?.toString() === combinationId
    )
    
    if (favorite) {
      // Remove from favorited combinations set
      setFavoritedCombinations(prev => {
        const newSet = new Set(prev)
        newSet.delete(combinationId)
        return newSet
      })
      
      // Remove from favorites array
      const updatedFavorites = favoriteSchedules.filter(fav => fav.id !== favorite.id)
      setFavoriteSchedules(updatedFavorites)
      
      // Update localStorage
      SecureStorage.setItem('favoriteSchedules', JSON.stringify(updatedFavorites)) // 🔒 User-specific
      const updatedCombinations = Array.from(favoritedCombinations).filter(id => id !== combinationId)
      SecureStorage.setItem('favoritedCombinations', JSON.stringify(updatedCombinations)) // 🔒 User-specific
    }
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      {(generatedSchedules || viewingFavoriteSchedule) ? (
        <>
        {/* Mobile-first responsive layout */}
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 h-full">
          {/* Main content - Canvas takes full width on mobile */}
          <div className="lg:col-span-3 lg:order-1 space-y-4 sm:space-y-6">
            {/* Canvas */}
            <ScheduleVisualization 
              scheduleName={viewingFavoriteSchedule?.name}
              scheduleData={(viewingFavoriteSchedule ? (() => {
                
                // Handle nested data structure
                let courses: VisualizationCourseSection[] = [];
                let actualCombination = viewingFavoriteSchedule.combination as unknown;
                
                // Check for nested combination structure
                if ((actualCombination as { combination?: unknown }).combination) {
                  actualCombination = (actualCombination as { combination: unknown }).combination;
                }
                
                if ((actualCombination as { courses?: unknown[] }).courses) {
                  // New format - already has courses array
                  const rawCourses = (actualCombination as { courses: { course_id: number; course_code: string; course_name: string; section_id: number; section_number: string; professor: string; sessions: any[] }[] }).courses;
                  
                  courses = rawCourses.map(course => ({
                    course_id: course.course_id,
                    course_code: course.course_code,
                    course_name: course.course_name,
                    section_id: course.section_id,
                    section_number: course.section_number,
                    professor: course.professor,
                    sessions: (course.sessions || []).map((session: any) => ({
                      session_id: session.id || session.session_id || 0,
                      session_type: session.session_type || 'Unknown',
                      day: session.day_of_week || session.day || 'Monday',
                      start_time: session.start_time || '08:00',
                      end_time: session.end_time || '09:00',
                      location: session.classroom || session.location || 'TBA',
                      modality: 'Presencial'
                    }))
                  }));
                  
                } else if ((actualCombination as { sections?: unknown[] }).sections) {
                  // Old format - transform sections to courses
                  const sections = (actualCombination as { sections: { id: number; course_code: string; course_name: string; section_number?: string; professor?: string; sessions?: TypesSession[] }[] }).sections;
                  courses = sections.map((section) => ({
                    course_id: section.id,
                    course_code: section.course_code,
                    course_name: section.course_name,
                    section_id: section.id,
                    section_number: section.section_number || 'N/A',
                    professor: section.professor || 'TBA',
                    sessions: (section.sessions || []).map((session) => ({
                      session_id: session.id,
                      session_type: session.session_type,
                      day: session.day_of_week,
                      start_time: session.start_time,
                      end_time: session.end_time, 
                      location: session.classroom,
                      modality: 'Presencial'
                    }))
                  }));
                }
                
                const scheduleData = {
                  combinations: [{
                    combination_id: ((actualCombination as { combination_id?: string | number }).combination_id || 'temp').toString(),
                    course_count: courses.length,
                    courses: courses,
                    sections: (actualCombination as { sections?: unknown[] }).sections || [], // Keep original sections for compatibility
                    conflicts: (actualCombination as { conflicts?: unknown[] }).conflicts || []
                  }],
                  total_combinations: 1,
                  selected_courses_count: courses.length
                };
                
                return scheduleData;
            })() : generatedSchedules ? (() => {
                const transformedData = {
                ...generatedSchedules,
                combinations: generatedSchedules.combinations.map(combination => ({
                  ...combination,
                  combination_id: combination.combination_id.toString(),
                  course_count: combination.course_count || combination.courses?.length || 0,
                  courses: (combination.courses || []).map(course => ({
                    course_id: course.course_id,
                    course_code: course.course_code,
                    course_name: course.course_name,
                    section_id: course.section_id,
                    section_number: course.section_number,
                    professor: course.professor,
                    sessions: course.sessions.map((session: any) => ({
                      session_id: session.session_id || session.id,
                      session_type: session.session_type,
                      day: session.day || session.day_of_week,  // Handle both formats
                      start_time: session.start_time,
                      end_time: session.end_time,
                      location: session.location || session.classroom,  // Handle both formats
                      modality: session.modality || 'Presencial'
                    }))
                  }))
                })),
                selected_courses_count: generatedSchedules.combinations?.[0]?.courses?.length || 0
              };
              return transformedData;
              })() : null!)}
              onAddToFavorites={viewingFavoriteSchedule ? undefined : addToFavoritesWrapper}
              onRemoveFromFavorites={viewingFavoriteSchedule ? (id) => {
                // Remove the favorite schedule entirely
                const updatedFavorites = favoriteSchedules.filter(fav => fav.id !== viewingFavoriteSchedule.id)
                setFavoriteSchedules(updatedFavorites)
                SecureStorage.setItem('favoriteSchedules', JSON.stringify(updatedFavorites)) // 🔒 User-specific
                
                // Remove from favoritedCombinations set
                const newFavoritedCombinations = new Set(favoritedCombinations)
                newFavoritedCombinations.delete(id)
                setFavoritedCombinations(newFavoritedCombinations)
                SecureStorage.setItem('favoritedCombinations', JSON.stringify([...newFavoritedCombinations])) // 🔒 User-specific
                
                // Go back to my schedules
                setViewingFavoriteSchedule(null)
                router.push('/dashboard/my-schedules')
              } : removeFromFavoritesByCombinationId}
              favoritedCombinations={viewingFavoriteSchedule ? new Set([viewingFavoriteSchedule.combination.combination_id?.toString()]) : favoritedCombinations}
              showBackButton={true}
              onBackToSelection={() => {
                if (viewingFavoriteSchedule) {
                  setViewingFavoriteSchedule(null)
                  router.push('/dashboard/my-schedules')
                } else {
                  router.push('/dashboard/generate')
                }
              }}
            />
          </div>

          {/* Right Column - Compact Search + Selected Courses - Better mobile */}
          <div className="lg:col-span-1 lg:order-2 space-y-3 sm:space-y-4">
            {/* Compact Search - Mobile optimized */}
            <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
              <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <Search className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-500" />
                  <span className="text-xs sm:text-sm font-medium text-foreground">Buscar Cursos</span>
                </div>
                
                <Input
                  placeholder="Nombre del curso..."
                  value={scheduleSearchQuery}
                  onChange={(e) => setScheduleSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScheduleSearch()}
                  className="text-sm py-2 sm:py-1.5"
                />
                
                <div className="grid grid-cols-1 gap-2">
                  <select
                    value={scheduleFilters.department}
                    onChange={(e) => setScheduleFilters({...scheduleFilters, department: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md text-sm bg-background text-foreground border-input focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="">Todas las Carreras</option>
                    <option value="CS">Ciencias de la Computación</option>
                    <option value="DS">Data Science</option>
                    <option value="BIO">Bioingeniería</option>
                    <option value="IND">Industrial</option>
                    <option value="ME">Mecánica</option>
                    <option value="CI">Civil</option>
                    <option value="EL">Electrónica</option>
                    <option value="EN">Energía</option>
                    <option value="AM">Matemática</option>
                    <option value="MT">Mecatrónica</option>
                    <option value="HH">Humanidades</option>
                  </select>
                </div>
                
                <Button 
                  onClick={handleScheduleSearch} 
                  disabled={scheduleSearchLoading}
                  size="sm"
                  className="w-full bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white text-xs transition-all duration-200 hover:scale-[1.02] hover:shadow-lg py-2 sm:py-1.5"
                >
                  {scheduleSearchLoading ? (
                    <span className="flex items-center gap-1 justify-center">
                      <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="text-xs">Buscando...</span>
                    </span>
                  ) : (
                    <span className="text-xs">Buscar</span>
                  )}
                </Button>
                
                <div className="text-xs text-muted-foreground text-center">
                  En: <span className="font-medium text-cyan-600">UTEC</span>
                </div>
              </CardContent>
            </Card>

            {/* Search Results - Compact Mobile-optimized */}
            {scheduleSearchResults && scheduleSearchResults.length > 0 && (
              <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
                <CardContent className="p-2 sm:p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-muted-foreground">
                      {scheduleSearchResults.length} encontrados
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setScheduleSearchResults([])}
                      className="h-6 px-2 text-xs"
                    >
                      Limpiar
                    </Button>
                  </div>
                  
                  <div className="max-h-40 sm:max-h-48 overflow-y-auto space-y-1.5 sm:space-y-2">
                    {scheduleSearchResults.slice(0, 5).map((course, index) => (
                      <div 
                        key={course.id} 
                        className="p-2 border border-border rounded bg-muted/30 hover:bg-muted/50 transition-all duration-200 animate-in slide-in-from-right"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-foreground truncate leading-tight">
                              {course.name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {course.code}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => setSectionPopup({courseId: course.id, course})}
                            className="h-6 w-6 px-0 text-xs bg-cyan-500 hover:bg-cyan-600 text-white transition-all duration-200 hover:scale-110 hover:shadow-md flex-shrink-0"
                          >
                            <span className="transform transition-transform duration-200 group-hover:rotate-90">+</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                    {scheduleSearchResults.length > 5 && (
                      <div className="text-xs text-center text-muted-foreground py-1">
                        +{scheduleSearchResults.length - 5} más cursos
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Selected Sections */}
            <SelectedSectionsCard 
              selectedSections={viewingFavoriteSchedule ? 
                // When viewing favorite, convert courses back to selected sections format
                (() => {
                  let actualCombination = viewingFavoriteSchedule.combination as unknown;
                  if ((actualCombination as { combination?: unknown }).combination) {
                    actualCombination = (actualCombination as { combination: unknown }).combination;
                  }
                  
                  if ((actualCombination as { courses?: unknown[] }).courses) {
                    return ((actualCombination as { courses: { section_id: number; course_code: string; course_name: string; section_number: string; professor: string; sessions: TypesSession[] }[] }).courses).map((course) => ({
                      sectionId: course.section_id,
                      courseCode: course.course_code,
                      courseName: course.course_name,
                      sectionCode: course.section_number,
                      professor: course.professor,
                      sessions: course.sessions || []
                    }));
                  }
                  return [];
                })() 
                : selectedSections
              }
              groupSectionsByCourse={viewingFavoriteSchedule ? 
                // Custom grouping for favorite schedule
                () => {
                  let actualCombination = viewingFavoriteSchedule.combination as unknown;
                  if ((actualCombination as { combination?: unknown }).combination) {
                    actualCombination = (actualCombination as { combination: unknown }).combination;
                  }
                  
                  if ((actualCombination as { courses?: unknown[] }).courses) {
                    return ((actualCombination as { courses: { section_id: number; course_code: string; course_name: string; section_number: string; professor: string; sessions: TypesSession[] }[] }).courses).map((course, courseIndex) => ({
                      courseName: course.course_name,
                      courseCode: course.course_code,
                      sections: [{
                        sectionId: course.section_id,
                        courseCode: course.course_code,
                        courseName: course.course_name,
                        sectionCode: course.section_number,
                        professor: course.professor,
                        sessions: course.sessions || [],
                        index: courseIndex
                      }]
                    }));
                  }
                  return [];
                }
                : groupSectionsByCourse
              }
              collapsedCourses={collapsedCourses}
              toggleCourseCollapse={toggleCourseCollapse}
              removeSection={viewingFavoriteSchedule ? () => {} : removeSection} // Disable removal when viewing favorite
              handleGenerateSchedules={viewingFavoriteSchedule ? () => {} : handleGenerateSchedules} // Disable generation when viewing favorite
              isLoading={false} // Never loading when viewing favorite
            />
          </div>
        </div>

        {/* Section Selection Popup - Same as in generate tab */}
        <SectionSelectionPopup 
          sectionPopup={sectionPopup}
          setSectionPopup={setSectionPopup}
          selectedSections={selectedSections}
          addSection={addSection}
          removeSection={removeSection}
        />
        </>
      ) : (
        <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
          <CardHeader className="text-center sm:text-left">
            <CardTitle className="text-foreground text-lg sm:text-xl">Horarios Generados</CardTitle>
            <CardDescription className="text-sm sm:text-base">Genera horarios para ver las combinaciones posibles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 sm:py-12 text-muted-foreground px-4">
              <Calendar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-sm sm:text-base">No hay horarios generados aún.</p>
              <p className="text-xs sm:text-sm mt-2 max-w-md mx-auto">Ve a "Generar Horarios" para seleccionar cursos y crear combinaciones.</p>
              <Button 
                onClick={() => router.push('/dashboard/generate')}
                className="mt-4 sm:mt-6 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white text-sm"
              >
                Ir a Generar Horarios
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}