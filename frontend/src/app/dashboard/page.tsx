"use client"

import { useState, useEffect } from "react"
import {
  Search,
  Calendar,
  BookOpen,
  Plus,
  X,
  Menu,
  ChevronDown,
  LogOut,
  ChevronRight,
  Grid3X3,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AutocompleteInput } from "@/components/ui/autocomplete-input"
import { useAutocomplete } from "@/hooks/useAutocomplete"
import { authService } from "@/services/auth"
import { apiService } from "@/services/api"
import { Course, SelectedSection, Filter } from "@/types"
import { ScheduleVisualization } from "@/components/ScheduleVisualization"
import { FavoriteSchedules } from "@/components/FavoriteSchedules"
import { SessionManager } from '@/components/collaboration/SessionManager'
import { CollaborativeScheduleBuilder } from '@/components/collaboration/CollaborativeScheduleBuilder'
import { useCollaborationStore } from '@/stores/collaborationStore'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, Share, ArrowLeft } from 'lucide-react'

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("generate")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedSections, setSelectedSections] = useState<SelectedSection[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Course[]>([])
  // Separate search for Horarios tab
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState("")
  const [scheduleSearchResults, setScheduleSearchResults] = useState<Course[]>([])
  const [scheduleSearchLoading, setScheduleSearchLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [displayPage, setDisplayPage] = useState(1)
  const [resultsPerPage] = useState(10)
  const [sectionPopup, setSectionPopup] = useState<{courseId: number, course: any} | null>(null)
  const [generatedSchedules, setGeneratedSchedules] = useState<any>(null)
  const [filters, setFilters] = useState<Filter>({
    university: "UTEC", // User's university - will be dynamic later
    department: "",
    semester: "ciclo-1",
    schedule: "",
    modality: "",
  })
  
  // Autocomplete hook for real-time search (using static university initially)
  const {
    suggestions: autocompleteSuggestions,
    loading: autocompleteLoading,
    error: autocompleteError,
    query: autocompleteQuery,
    setQuery: setAutocompleteQuery
  } = useAutocomplete(undefined, {
    university: "UTEC",
    debounceMs: 300,
    minLength: 3,
    limit: 10
  })
  
  // Collaboration states
  const { currentSession } = useCollaborationStore()
  const [collaborationTab, setCollaborationTab] = useState('sessions')
  const [compareCode, setCompareCode] = useState('')
  
  const [scheduleFilters, setScheduleFilters] = useState({
    department: "",
    semester: "ciclo-1",
  })
  
  // Favorite schedule management states
  const [favoriteSchedules, setFavoriteSchedules] = useState<any[]>([])
  const [favoritedCombinations, setFavoritedCombinations] = useState<Set<string>>(new Set())
  const [isCardFlipped, setIsCardFlipped] = useState(false)
  const [viewingFavoriteSchedule, setViewingFavoriteSchedule] = useState<any>(null)
  const [collapsedCourses, setCollapsedCourses] = useState<Set<string>>(new Set())

  // Helper function to group sections by course
  const groupSectionsByCourse = () => {
    const grouped = selectedSections.reduce((acc, section, index) => {
      const courseCode = section.courseCode
      if (!acc[courseCode]) {
        acc[courseCode] = {
          courseName: section.courseName,
          courseCode: section.courseCode,
          credits: section.credits,
          sections: []
        }
      }
      acc[courseCode].sections.push({ ...section, index })
      return acc
    }, {} as Record<string, { courseName: string, courseCode: string, credits: number, sections: Array<any & { index: number }> }>)
    
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

  const sidebarSections = [
    {
      id: "generate",
      title: "Generar Horarios",
      shortTitle: "Generar",
      icon: Calendar,
    },
    {
      id: "schedules",
      title: "Ver Horarios",
      shortTitle: "Horarios",
      icon: Grid3X3,
    },
    {
      id: "my-schedules",
      title: "Mis Horarios",
      shortTitle: "Mis Horarios", 
      icon: BookOpen,
    },
    {
      id: "collaboration",
      title: "Colaboración",
      shortTitle: "Colaborar",
      icon: Users,
    },
  ]

  // Sync autocomplete with search results when autocomplete changes
  useEffect(() => {
    if (autocompleteSuggestions.length > 0 && autocompleteQuery.length >= 3) {
      setSearchResults(autocompleteSuggestions)
    } else if (autocompleteQuery.length === 0) {
      setSearchResults([])
    }
  }, [autocompleteSuggestions, autocompleteQuery])

  // Sync search query with autocomplete query
  useEffect(() => {
    setAutocompleteQuery(searchQuery)
  }, [searchQuery, setAutocompleteQuery])

  const handleSearch = async (page: number = 1) => {
    if (!searchQuery.trim() && !filters.university && !filters.department) return
    
    setIsLoading(true)
    setCurrentPage(page)
    setDisplayPage(1) // Reset display pagination on new search
    try {
      // Use autocomplete endpoint for faster results
      const response = await apiService.autocompleteCourses(
        searchQuery.trim(), 
        filters.university, 
        20
      )
      setSearchResults(response || [])
    } catch (error) {
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  // Separate search function for Horarios tab
  const handleScheduleSearch = async () => {
    if (!scheduleSearchQuery.trim()) {
      setScheduleSearchResults([])
      return
    }
    
    setScheduleSearchLoading(true)
    try {
      const params = {
        q: scheduleSearchQuery.trim(),
        university: filters.university, // Use user's university automatically
        department: scheduleFilters.department || undefined,
        semester: scheduleFilters.semester || undefined,
        size: 20
      }
      
      const response = await apiService.searchCourses(params)
      setScheduleSearchResults(response || [])
    } catch (error) {

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
      credits: course.credits,
      sessions: section.sessions,
    }
    
    setSelectedSections([...selectedSections, newSelection])
  }

  const removeSection = (index: number) => {
    setSelectedSections(selectedSections.filter((_, i) => i !== index))
  }

  const totalCredits = selectedSections.reduce((creditsMap, section) => {
    creditsMap[section.courseCode] = section.credits
    return creditsMap
  }, {} as Record<string, number>)
  const totalCreditsSum = Object.values(totalCredits).reduce((sum, credits) => sum + credits, 0)

  const handleGenerateSchedules = async () => {
    if (selectedSections.length === 0) return

    setIsLoading(true)
    try {
      const request = {
        selected_sections: selectedSections.map(s => s.sectionId),
        semester: filters.semester
      }
      
      const response = await apiService.generateSchedules(request)
      setGeneratedSchedules(response.data)
      setActiveSection('schedules') // Switch to schedules view
      setIsCardFlipped(true) // Flip to show schedules instead of switching sections
      setViewingFavoriteSchedule(null) // Clear any favorite being viewed
    } catch (error) {
    } finally {
      setIsLoading(false)
    }
  }

  // Favorite schedule management
  const addToFavorites = (schedule: any) => {
    const favoriteId = `fav_${Date.now()}`
    const newFavorite = {
      id: favoriteId,
      name: `Horario ${favoriteSchedules.length + 1}`,
      combination: schedule,
      created_at: new Date().toISOString(),
      notes: ''
    }
    setFavoriteSchedules(prev => [...prev, newFavorite])
    setFavoritedCombinations(prev => new Set([...prev, schedule.combination_id]))
    
    // Store in localStorage for persistence
    const updatedFavorites = [...favoriteSchedules, newFavorite]
    localStorage.setItem('favoriteSchedules', JSON.stringify(updatedFavorites))
    localStorage.setItem('favoritedCombinations', JSON.stringify([...favoritedCombinations, schedule.combination_id]))
  }

  const removeFavorite = (id: string) => {
    const favorite = favoriteSchedules.find(fav => fav.id === id)
    if (favorite) {
      setFavoritedCombinations(prev => {
        const newSet = new Set(prev)
        newSet.delete(favorite.combination.combination_id)
        return newSet
      })
    }
    
    const updatedFavorites = favoriteSchedules.filter(fav => fav.id !== id)
    setFavoriteSchedules(updatedFavorites)
    localStorage.setItem('favoriteSchedules', JSON.stringify(updatedFavorites))
    localStorage.setItem('favoritedCombinations', JSON.stringify([...favoritedCombinations]))
  }

  const editFavorite = (id: string, name: string, notes?: string) => {
    const updatedFavorites = favoriteSchedules.map(fav => 
      fav.id === id ? { ...fav, name, notes } : fav
    )
    setFavoriteSchedules(updatedFavorites)
    localStorage.setItem('favoriteSchedules', JSON.stringify(updatedFavorites))
  }

  // Check if user is authenticated (only run on client side)
  useEffect(() => {
    if (typeof window !== 'undefined' && !authService.isAuthenticated()) {
      window.location.href = '/landing'
    }
  }, [])

  // Mobile detection and responsive handling
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024 // lg breakpoint
      setIsMobile(mobile)
      if (mobile) {
        setSidebarCollapsed(true)
        setMobileMenuOpen(false)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load favorites from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFavorites = localStorage.getItem('favoriteSchedules')
      const savedCombinations = localStorage.getItem('favoritedCombinations')
      
      if (savedFavorites) {
        try {
          setFavoriteSchedules(JSON.parse(savedFavorites))
        } catch (error) {
          console.error('Error loading saved favorites:', error)
        }
      }
      
      if (savedCombinations) {
        try {
          const combinations = JSON.parse(savedCombinations)
          setFavoritedCombinations(new Set(combinations))
        } catch (error) {
          console.error('Error loading saved combinations:', error)
        }
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-slate-950 dark:via-purple-950 dark:to-slate-950">
      <div className="flex relative">
        {/* Mobile overlay */}
        {isMobile && mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <div
          className={`${
            isMobile 
              ? `fixed left-0 top-0 h-full z-50 transform transition-transform duration-300 ${
                  mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                } w-80`
              : sidebarCollapsed ? "w-20" : "w-80"
          } bg-card/95 backdrop-blur-sm border-r border-border min-h-screen ${
            !isMobile ? 'transition-all duration-500 ease-in-out' : ''
          } flex flex-col shadow-xl`}
        >
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              {(!sidebarCollapsed || isMobile) && (
                <div className="flex items-center gap-3 animate-in slide-in-from-left duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
                    <Calendar className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">Schedule Maker</h1>
                    <p className="text-sm text-muted-foreground">Gestión Inteligente</p>
                  </div>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (isMobile) {
                    setMobileMenuOpen(false)
                  } else {
                    setSidebarCollapsed(!sidebarCollapsed)
                  }
                }}
                className="p-3 hover:bg-accent rounded-xl transition-all duration-200 hover:scale-105"
              >
                <Menu className={`w-5 h-5 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`} />
              </Button>
            </div>
          </div>          {/* Navigation */}
          <div className="flex-1 p-4">
            <div className="space-y-3">
              {sidebarSections.map((section, index) => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id)
                      if (isMobile) {
                        setMobileMenuOpen(false)
                      }
                    }}
                    className={`w-full p-4 rounded-xl text-left transition-all duration-300 transform hover:scale-[1.02] group animate-in slide-in-from-left duration-300 ${
                      activeSection === section.id
                        ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25"
                        : "hover:bg-accent text-foreground hover:shadow-md"
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                    title={sidebarCollapsed ? section.title : undefined}
                  >
                    <div className="flex items-center gap-4">
                      <Icon
                        className={`${sidebarCollapsed ? "w-6 h-6" : "w-5 h-5"} transition-all duration-300 ${
                          activeSection === section.id ? "text-white" : "text-muted-foreground group-hover:text-purple-600"
                        }`}
                      />
                      {(!sidebarCollapsed || isMobile) && (
                        <div className="flex-1 animate-in slide-in-from-left duration-300">
                          <div className="font-semibold text-sm">{section.shortTitle}</div>
                        </div>
                      )}
                      {(!sidebarCollapsed || isMobile) && (
                        <ChevronRight
                          className={`w-4 h-4 transition-all duration-300 ${
                            activeSection === section.id
                              ? "text-white rotate-90"
                              : "text-muted-foreground group-hover:text-purple-600 group-hover:translate-x-1"
                          }`}
                        />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* User Profile */}
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => authService.logout()}
              className="w-full justify-start gap-3 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4" />
              {(!sidebarCollapsed || isMobile) && "Cerrar Sesión"}
            </Button>
          </div>
        </div>

        {/* Mobile Header */}
        {isMobile && (
          <div className="fixed top-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-3 lg:hidden">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(true)}
                className="p-2"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-foreground">Schedule Maker</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => authService.logout()}
                className="p-2 text-muted-foreground hover:text-red-400"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className={`flex-1 flex flex-col ${isMobile ? 'pt-16' : ''}`}>
          {activeSection === "generate" && (
            <div className="flex-1 p-4 sm:p-6 lg:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 h-full">
                {/* Search and Filters - Left Columns */}
                <div className="lg:col-span-3 space-y-4 sm:space-y-6">
                  <Card className="bg-card/80 backdrop-blur-sm border-border shadow-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <Search className="w-5 h-5 text-purple-500" />
                        Buscar Cursos
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Encuentra y selecciona las secciones que deseas incluir en tu horario
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
                        <select
                          value={filters.department}
                          onChange={(e) => setFilters({...filters, department: e.target.value})}
                          className="px-3 py-2 border rounded-md text-sm"
                        >
                          <option value="">Todas las Carreras</option>
                          <option value="CS">Ciencias de la Computación</option>
                          <option value="DS">Data Science</option>
                          <option value="BIO">Bioingeniería</option>
                          <option value="IND">Ingeniería Industrial</option>
                          <option value="ME">Ingeniería Mecánica</option>
                          <option value="CI">Ingeniería Civil</option>
                          <option value="EE">Ingeniería Eléctrica</option>
                          <option value="EN">Ingeniería de la Energía</option>
                          <option value="EL">Ingeniería Electrónica</option>
                          <option value="AM">Matemática Aplicada</option>
                          <option value="MT">Ingeniería Mecatrónica</option>
                          <option value="HH">Humanidades</option>
                          <option value="CC">Ciencias</option>
                        </select>
                        
                        <select
                          value={filters.semester}
                          onChange={(e) => setFilters({...filters, semester: e.target.value})}
                          className="px-3 py-2 border rounded-md text-sm"
                        >
                          <option value="ciclo-1">Ciclo 1</option>
                          <option value="ciclo-2">Ciclo 2</option>
                          <option value="ciclo-3">Ciclo 3</option>
                          <option value="ciclo-4">Ciclo 4</option>
                          <option value="ciclo-5">Ciclo 5</option>
                          <option value="ciclo-6">Ciclo 6</option>
                          <option value="ciclo-7">Ciclo 7</option>
                          <option value="ciclo-8">Ciclo 8</option>
                          <option value="electivo">Electivos</option>
                        </select>
                        
                        <select
                          value={filters.modality}
                          onChange={(e) => setFilters({...filters, modality: e.target.value})}
                          className="px-3 py-2 border rounded-md text-sm"
                        >
                          <option value="">Modalidad</option>
                          <option value="presencial">Presencial</option>
                          <option value="virtual">Virtual</option>
                          <option value="hibrido">Híbrido</option>
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <AutocompleteInput
                          placeholder="Buscar por nombre o código del curso... (mín 3 caracteres)"
                          value={searchQuery}
                          onChange={setSearchQuery}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                          className="flex-1"
                        />
                        <Button onClick={() => handleSearch()} disabled={isLoading}>
                          {isLoading ? "Buscando..." : "Buscar"}
                        </Button>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        Buscando en: <span className="font-medium text-purple-600">{filters.university}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Search Results */}
                  <div className="space-y-4">
                    {(autocompleteLoading || isLoading) && (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                        <span className="ml-2 text-muted-foreground">Buscando cursos...</span>
                      </div>
                    )}
                    
                    {autocompleteError && (
                      <div className="p-4 text-red-600 text-sm bg-red-50 rounded-md">
                        Error: {autocompleteError}
                      </div>
                    )}
                    
                    {searchResults && searchResults.length > 0 && !(autocompleteLoading || isLoading) ? (
                      <>
                        {/* Course Cards - No header needed */}
                        <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-transparent">
                          {searchResults
                            .slice((displayPage - 1) * resultsPerPage, displayPage * resultsPerPage)
                            .map((course, courseIndex) => (
                              <Card 
                                key={course.id} 
                                className="bg-card/80 backdrop-blur-sm border-border shadow-xl hover:shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom"
                                style={{ animationDelay: `${courseIndex * 75}ms` }}
                              >
                                <CardHeader>
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <CardTitle className="text-lg text-foreground">{course.name}</CardTitle>
                                      <CardDescription className="text-muted-foreground">
                                        {course.code} • {course.credits} créditos • {course.university?.short_name || 'Universidad'}
                                      </CardDescription>
                                      <div className="text-sm text-muted-foreground mt-2">
                                        {course.sections?.length || 0} secciones disponibles
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => {

                                          setSectionPopup({courseId: course.id, course});
                                        }}
                                        className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                                      >
                                        <Plus className="w-4 h-4 mr-1 transition-transform duration-200 group-hover:rotate-90" />
                                        Seleccionar Secciones
                                      </Button>
                                    </div>
                                  </div>
                                </CardHeader>
                              </Card>
                            ))
                          }
                        </div>
                      </>
                    ) : (
                      !autocompleteLoading && !isLoading && (
                        <div className="text-center py-8 text-muted-foreground">
                          {searchQuery.length >= 3 ? 
                            `No se encontraron cursos para "${searchQuery}"` : 
                            searchQuery.length > 0 && searchQuery.length < 3 ?
                            'Escribe al menos 3 caracteres para buscar' :
                            'Usa la búsqueda para encontrar cursos disponibles.'}
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Selected Sections - Right Column */}
                <div className="lg:col-span-1 space-y-4 sm:space-y-6">
                  <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <BookOpen className="w-5 h-5" />
                        Secciones Seleccionadas ({selectedSections.length})
                      </CardTitle>
                      <CardDescription>Total: {totalCreditsSum} créditos</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedSections.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground text-sm animate-in fade-in duration-300">
                            No hay secciones seleccionadas
                          </div>
                        ) : (
                          <>
                            {groupSectionsByCourse().map((courseGroup, groupIndex) => (
                          <div 
                            key={courseGroup.courseCode} 
                            className="border border-border rounded-lg bg-muted/30 animate-in slide-in-from-left duration-300"
                            style={{ animationDelay: `${groupIndex * 50}ms` }}
                          >
                            {/* Course Header */}
                            <div className="flex items-center justify-between p-3 transition-all duration-200 hover:bg-muted/40">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-foreground">
                                  {courseGroup.courseCode}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {courseGroup.courseName} • {courseGroup.credits} créd.
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {courseGroup.sections.length} sección{courseGroup.sections.length > 1 ? 'es' : ''}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {courseGroup.sections.length > 1 && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => toggleCourseCollapse(courseGroup.courseCode)}
                                    className="p-1 hover:bg-muted transition-all duration-200 hover:scale-105"
                                  >
                                    <ChevronDown 
                                      className={`w-4 h-4 transition-all duration-300 ease-out ${
                                        collapsedCourses.has(courseGroup.courseCode) 
                                          ? 'rotate-180 text-muted-foreground' 
                                          : 'rotate-0 text-foreground'
                                      }`} 
                                    />
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            {/* Sections List with Animation */}
                            <div className={`overflow-hidden transition-all duration-300 ease-out ${
                              courseGroup.sections.length === 1 || !collapsedCourses.has(courseGroup.courseCode)
                                ? 'max-h-96 opacity-100'
                                : 'max-h-0 opacity-0'
                            }`}>
                              <div className="border-t border-border bg-muted/20">
                                {courseGroup.sections.map((section, sectionIndex) => (
                                  <div 
                                    key={section.index} 
                                    className="flex items-center justify-between p-2 border-b border-border/50 last:border-b-0 transition-all duration-200 hover:bg-muted/40 animate-in fade-in slide-in-from-left"
                                    style={{ animationDelay: `${sectionIndex * 25}ms` }}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium text-foreground">
                                        Sección {section.sectionCode}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Prof. {section.professor}
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => removeSection(section.index)}
                                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1 transition-all duration-200 hover:scale-105"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                            ))}
                          </>
                        )}
                        
                        {selectedSections.length > 0 && (
                          <Button 
                            className="w-full mt-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg animate-in slide-in-from-bottom duration-500" 
                            size="lg"
                            onClick={handleGenerateSchedules}
                            disabled={isLoading}
                          >
                            <Calendar className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:rotate-12" />
                            {isLoading ? (
                              <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Generando...
                              </span>
                            ) : (
                              "Generar Horarios"
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Section Selection Popup */}
                {sectionPopup && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="bg-card border-border shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                      <CardHeader className="border-b border-border">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-foreground">{sectionPopup.course.name}</CardTitle>
                            <CardDescription className="text-muted-foreground">
                              {sectionPopup.course.code} • {sectionPopup.course.credits} créditos
                            </CardDescription>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSectionPopup(null)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-transparent">
                          <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium text-foreground">Selecciona las secciones que te interesan:</h4>
                              <div className="text-sm text-muted-foreground">
                                {selectedSections.filter(s => s.courseCode === sectionPopup.course.code).length} de {sectionPopup.course.sections?.length || 0} seleccionadas
                              </div>
                            </div>
                            {sectionPopup.course.sections?.map((section: any) => {
                              const isSelected = selectedSections.some(s => s.sectionId === section.id);
                              const selectedIndex = selectedSections.findIndex(s => s.sectionId === section.id);
                              
                              return (
                                <div key={section.id} className={`flex items-center justify-between p-4 border rounded-lg transition-all duration-200 ${
                                  isSelected 
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                                    : 'border-border bg-muted/30 hover:bg-muted/50'
                                }`}>
                                  <div className="flex-1">
                                    <div className="font-medium text-foreground">Sección {section.section_number}</div>
                                    <div className="text-sm text-muted-foreground">
                                      Prof. {section.professor} • {section.enrolled}/{section.capacity} estudiantes
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-2">
                                      {section.sessions?.map((session: any, idx: number) => (
                                        <div key={idx} className="inline-block mr-3 mb-1">
                                          <span className={`px-2 py-1 rounded text-xs ${
                                            isSelected 
                                              ? 'bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200'
                                              : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                                          }`}>
                                            {(() => {
                                              const dayMap: Record<string, string> = {
                                                'Monday': 'Lun', 'Tuesday': 'Mar', 'Wednesday': 'Mié', 
                                                'Thursday': 'Jue', 'Friday': 'Vie', 'Saturday': 'Sáb', 'Sunday': 'Dom'
                                              };
                                              return dayMap[session.day] || session.day;
                                            })()} {session.start_time?.slice(0,5)}-{session.end_time?.slice(0,5)}
                                          </span>
                                        </div>
                                      )) || <span className="text-muted-foreground">Sin horarios definidos</span>}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {isSelected && (
                                      <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                        ✓ Seleccionada
                                      </span>
                                    )}
                                    <Button
                                      size="sm"
                                      variant={isSelected ? "destructive" : "default"}
                                      className={isSelected ? 
                                        "bg-red-500 hover:bg-red-600 text-white border-0" :
                                        "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0"
                                      }
                                      onClick={() => {
                                        if (isSelected) {
                                          removeSection(selectedIndex);
                                        } else {
                                          addSection(sectionPopup.course, section.id);
                                        }
                                      }}
                                    >
                                      {isSelected ? (
                                        <>
                                          <X className="w-4 h-4 mr-1" />
                                          Quitar
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="w-4 h-4 mr-1" />
                                          Agregar
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                      <div className="p-6 border-t border-border bg-muted/20">
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-muted-foreground">
                            {selectedSections.filter(s => s.courseCode === sectionPopup.course.code).length} secciones seleccionadas de este curso
                          </div>
                          <Button
                            onClick={() => setSectionPopup(null)}
                            className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0"
                          >
                            Listo
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

              </div>
            </div>
          )}

          {activeSection === "schedules" && (
            <div className="flex-1 p-4 sm:p-6 lg:p-8">
              {(generatedSchedules || viewingFavoriteSchedule) ? (
                <>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 h-full">
                  {/* Left Column - Canvas only (wider) */}
                  <div className="lg:col-span-3 space-y-4 sm:space-y-6">
                    {/* Canvas */}
                    <ScheduleVisualization 
                      scheduleData={viewingFavoriteSchedule ? {
                        combinations: [viewingFavoriteSchedule],
                        total_combinations: 1,
                        selected_courses_count: viewingFavoriteSchedule.courses.length
                      } : generatedSchedules} 
                      onAddToFavorites={addToFavorites}
                      favoritedCombinations={favoritedCombinations}
                      showBackButton={true}
                      onBackToSelection={() => {
                        if (viewingFavoriteSchedule) {
                          setViewingFavoriteSchedule(null)
                          setActiveSection('my-schedules')
                        } else {
                          setActiveSection('generate')
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
                          <Search className="w-4 h-4 text-purple-500" />
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
                          
                          <select
                            value={scheduleFilters.semester}
                            onChange={(e) => setScheduleFilters({...scheduleFilters, semester: e.target.value})}
                            className="px-2 py-1 border rounded text-xs"
                          >
                            <option value="ciclo-1">Ciclo 1</option>
                            <option value="ciclo-2">Ciclo 2</option>
                            <option value="ciclo-3">Ciclo 3</option>
                            <option value="ciclo-4">Ciclo 4</option>
                            <option value="ciclo-5">Ciclo 5</option>
                            <option value="ciclo-6">Ciclo 6</option>
                            <option value="ciclo-7">Ciclo 7</option>
                            <option value="ciclo-8">Ciclo 8</option>
                            <option value="electivo">Electivos</option>
                          </select>
                        </div>
                        
                        <Button 
                          onClick={handleScheduleSearch} 
                          disabled={scheduleSearchLoading}
                          size="sm"
                          className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
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
                          En: <span className="font-medium text-purple-600">{filters.university}</span>
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
                                      {course.code} • {course.credits} créd.
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => setSectionPopup({courseId: course.id, course})}
                                    className="h-6 px-2 text-xs bg-purple-500 hover:bg-purple-600 text-white transition-all duration-200 hover:scale-110 hover:shadow-md"
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
                    <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-foreground text-base">
                          <BookOpen className="w-4 h-4" />
                          Secciones Seleccionadas ({selectedSections.length})
                        </CardTitle>
                        <CardDescription className="text-sm">Total: {totalCreditsSum} créditos</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {selectedSections.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground text-sm animate-in fade-in duration-300">
                              No hay secciones seleccionadas
                            </div>
                          ) : (
                            <>
                              {groupSectionsByCourse().map((courseGroup, groupIndex) => (
                                <div 
                                  key={courseGroup.courseCode} 
                                  className="border border-border rounded-lg bg-muted/30 animate-in slide-in-from-left duration-300"
                                  style={{ animationDelay: `${groupIndex * 50}ms` }}
                                >
                                  {/* Course Header */}
                                  <div className="flex items-center justify-between p-3 transition-all duration-200 hover:bg-muted/40">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm text-foreground">
                                        {courseGroup.courseCode}
                                      </div>
                                      <div className="text-xs text-muted-foreground truncate">
                                        {courseGroup.courseName} • {courseGroup.credits} créd.
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {courseGroup.sections.length} sección{courseGroup.sections.length > 1 ? 'es' : ''}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {courseGroup.sections.length > 1 && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => toggleCourseCollapse(courseGroup.courseCode)}
                                          className="p-1 hover:bg-muted transition-all duration-200 hover:scale-105"
                                        >
                                          <ChevronDown 
                                            className={`w-4 h-4 transition-all duration-300 ease-out ${
                                              collapsedCourses.has(courseGroup.courseCode) 
                                                ? 'rotate-180 text-muted-foreground' 
                                                : 'rotate-0 text-foreground'
                                            }`} 
                                          />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Sections List with Animation */}
                                  <div className={`overflow-hidden transition-all duration-300 ease-out ${
                                    courseGroup.sections.length === 1 || !collapsedCourses.has(courseGroup.courseCode)
                                      ? 'max-h-96 opacity-100'
                                      : 'max-h-0 opacity-0'
                                  }`}>
                                    <div className="border-t border-border bg-muted/20">
                                      {courseGroup.sections.map((section, sectionIndex) => (
                                        <div 
                                          key={section.index} 
                                          className="flex items-center justify-between p-2 border-b border-border/50 last:border-b-0 transition-all duration-200 hover:bg-muted/40 animate-in fade-in slide-in-from-left"
                                          style={{ animationDelay: `${sectionIndex * 25}ms` }}
                                        >
                                          <div className="flex-1 min-w-0">
                                            <div className="text-xs font-medium text-foreground">
                                              Sección {section.sectionCode}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              Prof. {section.professor}
                                            </div>
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => removeSection(section.index)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1 transition-all duration-200 hover:scale-105"
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                          
                          {selectedSections.length > 0 && (
                            <Button 
                              className="w-full mt-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg animate-in slide-in-from-bottom duration-500" 
                              size="lg"
                              onClick={handleGenerateSchedules}
                              disabled={isLoading}
                            >
                              <Calendar className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:rotate-12" />
                              {isLoading ? (
                                <span className="flex items-center gap-2">
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  Regenerando...
                                </span>
                              ) : (
                                "Regenerar Horarios"
                              )}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Section Selection Popup - Same as in generate tab */}
                {sectionPopup && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="bg-card border-border shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                      <CardHeader className="border-b border-border">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-foreground">{sectionPopup.course.name}</CardTitle>
                            <CardDescription className="text-muted-foreground">
                              {sectionPopup.course.code} • {sectionPopup.course.credits} créditos
                            </CardDescription>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSectionPopup(null)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-transparent">
                          <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium text-foreground">Selecciona las secciones que te interesan:</h4>
                              <div className="text-sm text-muted-foreground">
                                {selectedSections.filter(s => s.courseCode === sectionPopup.course.code).length} de {sectionPopup.course.sections?.length || 0} seleccionadas
                              </div>
                            </div>
                            {sectionPopup.course.sections?.map((section: any) => {
                              const isSelected = selectedSections.some(s => s.sectionId === section.id);
                              const selectedIndex = selectedSections.findIndex(s => s.sectionId === section.id);
                              
                              return (
                                <div key={section.id} className={`flex items-center justify-between p-4 border rounded-lg transition-all duration-200 ${
                                  isSelected 
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                                    : 'border-border bg-muted/30 hover:bg-muted/50'
                                }`}>
                                  <div className="flex-1">
                                    <div className="font-medium text-foreground">Sección {section.section_number}</div>
                                    <div className="text-sm text-muted-foreground">
                                      Prof. {section.professor} • {section.enrolled}/{section.capacity} estudiantes
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-2">
                                      {section.sessions?.map((session: any, idx: number) => (
                                        <div key={idx} className="inline-block mr-3 mb-1">
                                          <span className={`px-2 py-1 rounded text-xs ${
                                            isSelected 
                                              ? 'bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200'
                                              : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                                          }`}>
                                            {(() => {
                                              const dayMap: Record<string, string> = {
                                                'Monday': 'Lun', 'Tuesday': 'Mar', 'Wednesday': 'Mié', 
                                                'Thursday': 'Jue', 'Friday': 'Vie', 'Saturday': 'Sáb', 'Sunday': 'Dom'
                                              };
                                              return dayMap[session.day] || session.day;
                                            })()} {session.start_time?.slice(0,5)}-{session.end_time?.slice(0,5)}
                                          </span>
                                        </div>
                                      )) || <span className="text-muted-foreground">Sin horarios definidos</span>}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {isSelected && (
                                      <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                        ✓ Seleccionada
                                      </span>
                                    )}
                                    <Button
                                      size="sm"
                                      variant={isSelected ? "destructive" : "default"}
                                      className={isSelected ? 
                                        "bg-red-500 hover:bg-red-600 text-white border-0" :
                                        "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0"
                                      }
                                      onClick={() => {
                                        if (isSelected) {
                                          removeSection(selectedIndex);
                                        } else {
                                          addSection(sectionPopup.course, section.id);
                                        }
                                      }}
                                    >
                                      {isSelected ? (
                                        <>
                                          <X className="w-4 h-4 mr-1" />
                                          Quitar
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="w-4 h-4 mr-1" />
                                          Agregar
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                      <div className="p-6 border-t border-border bg-muted/20">
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-muted-foreground">
                            {selectedSections.filter(s => s.courseCode === sectionPopup.course.code).length} secciones seleccionadas de este curso
                          </div>
                          <Button
                            onClick={() => setSectionPopup(null)}
                            className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0"
                          >
                            Listo
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
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
          )}

          {activeSection === "my-schedules" && (
            <div className="flex-1 p-4 sm:p-6 lg:p-8">
              <FavoriteSchedules
                favorites={favoriteSchedules}
                onEdit={editFavorite}
                onRemove={removeFavorite}
                onView={(schedule) => {
                  setViewingFavoriteSchedule(schedule)
                  setActiveSection("schedules")
                }}
              />
            </div>
          )}

          {activeSection === "collaboration" && (
            <div className="flex-1 p-4 sm:p-6 lg:p-8">
              {currentSession ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold">Sesión Colaborativa</h1>
                      <p className="text-muted-foreground">
                        Colaborando en: {currentSession.name}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => useCollaborationStore.getState().clearSession()}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Volver a Sesiones
                    </Button>
                  </div>
                  <CollaborativeScheduleBuilder />
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-bold">Centro de Colaboración</h1>
                    <p className="text-muted-foreground mt-2">
                      Crea, comparte y compara horarios con tus compañeros de clase
                    </p>
                  </div>

                  <Tabs value={collaborationTab} onValueChange={setCollaborationTab}>
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                      <TabsTrigger value="sessions" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Sesiones
                      </TabsTrigger>
                      <TabsTrigger value="shared" className="flex items-center gap-2">
                        <Share className="h-4 w-4" />
                        Compartidos
                      </TabsTrigger>
                      <TabsTrigger value="compare" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Comparar
                      </TabsTrigger>
                      <TabsTrigger value="history" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Historial
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="sessions" className="mt-6">
                      <SessionManager />
                    </TabsContent>

                    <TabsContent value="shared" className="mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Horarios Compartidos</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center py-12 text-muted-foreground">
                            <Share className="h-12 w-12 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Comparte tus Horarios</h3>
                            <p>Comparte tus horarios con compañeros para obtener comentarios y colaborar</p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="compare" className="mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Comparación de Horarios</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="text-center py-8 text-muted-foreground">
                            <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Compara Horarios</h3>
                            <p className="mb-4">Compara múltiples horarios lado a lado para encontrar la mejor opción</p>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-2">Comparar con código compartido</h4>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Ingresa el código del horario compartido"
                                  value={compareCode}
                                  onChange={(e) => setCompareCode(e.target.value)}
                                />
                                <Button 
                                  onClick={() => {
                                    if (compareCode.trim()) {
                                      window.open(`/compare?code=${compareCode.trim()}`, '_blank')
                                    }
                                  }}
                                  disabled={!compareCode.trim()}
                                >
                                  Comparar
                                </Button>
                              </div>
                            </div>
                            
                            <div className="border-t pt-4">
                              <h4 className="font-medium mb-2">O abre el comparador directamente</h4>
                              <Button 
                                variant="outline" 
                                onClick={() => window.open('/compare', '_blank')}
                                className="w-full"
                              >
                                <BarChart3 className="h-4 w-4 mr-2" />
                                Abrir Comparador de Horarios
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="history" className="mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Historial de Colaboración</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center py-12 text-muted-foreground">
                            <Calendar className="h-12 w-12 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Historial de Sesiones</h3>
                            <p>Ve el historial de tus sesiones colaborativas anteriores</p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}