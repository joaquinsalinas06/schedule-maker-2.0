"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { apiService } from "@/services/api"
import { 
  Course, 
  SelectedSection, 
  ScheduleResponse,
  SectionPopupState,
  GroupedCourse,
  ScheduleFilters,
  FavoriteSchedule
} from "@/types"
import { ScheduleVisualization } from "@/components/ScheduleVisualization"

// Dashboard Components
import { SelectedSectionsCard } from '@/components/dashboard/SelectedSectionsCard'
import { SectionSelectionPopup } from '@/components/dashboard/SectionSelectionPopup'

export default function SchedulesPage() {
  const router = useRouter()
  
  const [selectedSections, setSelectedSections] = useState<SelectedSection[]>([])
  const [generatedSchedules, setGeneratedSchedules] = useState<ScheduleResponse | null>(null)
  const [viewingFavoriteSchedule, setViewingFavoriteSchedule] = useState<FavoriteSchedule | null>(null)
  const [sectionPopup, setSectionPopup] = useState<SectionPopupState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
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
      const savedFavorites = localStorage.getItem('favoriteSchedules')
      const savedCombinations = localStorage.getItem('favoritedCombinations')
      const viewingFavorite = sessionStorage.getItem('viewingFavoriteSchedule')
      
      if (savedSchedules) {
        try {
          setGeneratedSchedules(JSON.parse(savedSchedules))
        } catch {
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
          console.log('📅 Loading viewingFavoriteSchedule from sessionStorage:', parsedFavorite)
          console.log('📅 Schedule name from sessionStorage:', parsedFavorite?.name)
          setViewingFavoriteSchedule(parsedFavorite)
          // Clear it after loading so it doesn't persist on refresh
          sessionStorage.removeItem('viewingFavoriteSchedule')
        } catch {
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
    } catch (_error) {
      // Handle auth errors through the axios interceptor
    } finally {
      setIsLoading(false)
    }
  }

  // Favorite schedule management
  const addToFavorites = (schedule: any) => {
    const favoriteId = `fav_${Date.now()}`
    const newFavorite: FavoriteSchedule = {
      id: favoriteId,
      name: `Horario ${favoriteSchedules.length + 1}`,
      combination: schedule.combination || schedule,
      created_at: new Date().toISOString(),
      notes: ''
    }
    setFavoriteSchedules(prev => [...prev, newFavorite])
    // Handle both favorite schedule format and regular schedule format
    const combinationId = schedule.combination?.combination_id || schedule.combination_id
    setFavoritedCombinations(prev => new Set([...prev, combinationId.toString()]))
    
    // Store in localStorage for persistence
    const updatedFavorites = [...favoriteSchedules, newFavorite]
    localStorage.setItem('favoriteSchedules', JSON.stringify(updatedFavorites))
    localStorage.setItem('favoritedCombinations', JSON.stringify([...favoritedCombinations, combinationId.toString()]))
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
      localStorage.setItem('favoriteSchedules', JSON.stringify(updatedFavorites))
      const updatedCombinations = Array.from(favoritedCombinations).filter(id => id !== combinationId)
      localStorage.setItem('favoritedCombinations', JSON.stringify(updatedCombinations))
    }
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      {(generatedSchedules || viewingFavoriteSchedule) ? (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 h-full">
          {/* Left Column - Canvas only (wider) */}
          <div className="lg:col-span-3 space-y-4 sm:space-y-6">
            {/* Canvas */}
            <ScheduleVisualization 
              scheduleName={(() => {
                console.log('🏷️  Passing scheduleName prop:', viewingFavoriteSchedule?.name)
                console.log('🏷️  viewingFavoriteSchedule object:', viewingFavoriteSchedule)
                return viewingFavoriteSchedule?.name
              })()}
              scheduleData={(viewingFavoriteSchedule ? (() => {
                console.log('📊 Building scheduleData for viewing favorite schedule:', viewingFavoriteSchedule);
                
                // Handle nested data structure
                let courses: any[] = [];
                let actualCombination = viewingFavoriteSchedule.combination as any;
                
                // Check for nested combination structure
                if (actualCombination.combination) {
                  actualCombination = actualCombination.combination;
                }
                
                if (actualCombination.courses) {
                  // New format - already has courses array
                  courses = actualCombination.courses;
                } else if (actualCombination.sections) {
                  // Old format - transform sections to courses
                  courses = actualCombination.sections.map((section: any) => ({
                    course_id: section.course_id || section.course?.id,
                    course_code: section.course?.code || 'N/A',
                    course_name: section.course?.name || 'Unknown Course',
                    section_id: section.id,
                    section_number: section.section_number || 'N/A',
                    professor: section.professor || 'TBA',
                    sessions: section.sessions?.map((session: any) => ({
                      session_id: session.id || Math.random(),
                      session_type: session.session_type || 'Lecture',
                      day: session.day_of_week || 1,
                      start_time: session.start_time || '08:00',
                      end_time: session.end_time || '09:00', 
                      location: session.classroom || 'TBA',
                      modality: 'Presencial'
                    })) || []
                  }));
                }
                
                const scheduleData = {
                  combinations: [{
                    combination_id: actualCombination.combination_id || 'temp',
                    course_count: courses.length,
                    courses: courses,
                    sections: actualCombination.sections || [], // Keep original sections for compatibility
                    conflicts: actualCombination.conflicts || []
                  }],
                  total_combinations: 1,
                  selected_courses_count: courses.length
                };
                
                console.log('Transformed schedule data:', scheduleData);
                return scheduleData;
            })() : generatedSchedules ? {
                ...generatedSchedules,
                selected_courses_count: generatedSchedules.combinations?.[0]?.courses?.length || 0
              } : null!) as any}
              onAddToFavorites={viewingFavoriteSchedule ? undefined : addToFavorites}
              onRemoveFromFavorites={viewingFavoriteSchedule ? (id) => {
                // Remove the favorite schedule entirely
                const updatedFavorites = favoriteSchedules.filter(fav => fav.id !== viewingFavoriteSchedule.id)
                setFavoriteSchedules(updatedFavorites)
                localStorage.setItem('favoriteSchedules', JSON.stringify(updatedFavorites))
                
                // Remove from favoritedCombinations set
                const newFavoritedCombinations = new Set(favoritedCombinations)
                newFavoritedCombinations.delete(id)
                setFavoritedCombinations(newFavoritedCombinations)
                localStorage.setItem('favoritedCombinations', JSON.stringify([...newFavoritedCombinations]))
                
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

          {/* Right Column - Compact Search + Selected Courses */}
          <div className="lg:col-span-1 space-y-4">
            {/* Compact Search */}
            <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm font-medium text-foreground">Buscar Cursos</span>
                </div>
                
                <Input
                  placeholder="Nombre del curso..."
                  value={scheduleSearchQuery}
                  onChange={(e) => setScheduleSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScheduleSearch()}
                  className="text-sm"
                />
                
                <div className="grid grid-cols-1 gap-2">
                  <select
                    value={scheduleFilters.department}
                    onChange={(e) => setScheduleFilters({...scheduleFilters, department: e.target.value})}
                    className="px-2 py-1 border rounded text-xs"
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
                  className="w-full bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white text-xs transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                >
                  {scheduleSearchLoading ? (
                    <span className="flex items-center gap-1 justify-center">
                      <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                      Buscando...
                    </span>
                  ) : (
                    "Buscar"
                  )}
                </Button>
                
                <div className="text-xs text-muted-foreground text-center">
                  En: <span className="font-medium text-cyan-600">UTEC</span>
                </div>
              </CardContent>
            </Card>

            {/* Search Results - Compact */}
            {scheduleSearchResults && scheduleSearchResults.length > 0 && (
              <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
                <CardContent className="p-3">
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
                  
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {scheduleSearchResults.slice(0, 5).map((course, index) => (
                      <div 
                        key={course.id} 
                        className="p-2 border border-border rounded bg-muted/30 hover:bg-muted/50 transition-all duration-200 animate-in slide-in-from-right"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-foreground truncate">
                              {course.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {course.code}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => setSectionPopup({courseId: course.id, course})}
                            className="h-6 px-2 text-xs bg-cyan-500 hover:bg-cyan-600 text-white transition-all duration-200 hover:scale-110 hover:shadow-md"
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
                  let actualCombination = viewingFavoriteSchedule.combination as any;
                  if (actualCombination.combination) {
                    actualCombination = actualCombination.combination;
                  }
                  
                  if (actualCombination.courses) {
                    return actualCombination.courses.map((course: any, index: number) => ({
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
                  let actualCombination = viewingFavoriteSchedule.combination as any;
                  if (actualCombination.combination) {
                    actualCombination = actualCombination.combination;
                  }
                  
                  if (actualCombination.courses) {
                    return actualCombination.courses.map((course: any, index: number) => ({
                      courseName: course.course_name,
                      courseCode: course.course_code,
                      sections: [{
                        sectionId: course.section_id,
                        courseCode: course.course_code,
                        courseName: course.course_name,
                        sectionCode: course.section_number,
                        professor: course.professor,
                        sessions: course.sessions || [],
                        index: index
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
          <CardHeader>
            <CardTitle className="text-foreground">Horarios Generados</CardTitle>
            <CardDescription>Genera horarios para ver las combinaciones posibles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No hay horarios generados aún.</p>
              <p className="text-sm mt-2">Ve a &quot;Generar Horarios&quot; para seleccionar cursos y crear combinaciones.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}