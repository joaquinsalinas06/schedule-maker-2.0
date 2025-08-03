"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAutocomplete } from "@/hooks/useAutocomplete"
import { apiService } from "@/services/api"
import { 
  Course, 
  SelectedSection, 
  Filter, 
  SectionPopupState,
  GroupedCourse
} from "@/types"

// Dashboard Components
import { CourseSearchCard } from '@/components/dashboard/CourseSearchCard'
import { CourseResultsGrid } from '@/components/dashboard/CourseResultsGrid'
import { SelectedSectionsCard } from '@/components/dashboard/SelectedSectionsCard'
import { SectionSelectionPopup } from '@/components/dashboard/SectionSelectionPopup'

export default function GeneratePage() {
  const router = useRouter()
  
  const [selectedSections, setSelectedSections] = useState<SelectedSection[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [displayPage, setDisplayPage] = useState(1)
  const [resultsPerPage] = useState(10)
  const [sectionPopup, setSectionPopup] = useState<SectionPopupState | null>(null)
  const [filters, setFilters] = useState<Filter>({
    university: "UTEC", // User's university - will be dynamic later
    department: "",
    schedule: "",
    modality: "",
  })
  const [collapsedCourses, setCollapsedCourses] = useState<Set<string>>(new Set())
  
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

  const handleSearch = async () => {
    if (!searchQuery.trim() && !filters.university && !filters.department) return
    
    setIsLoading(true)
    setDisplayPage(1) // Reset display pagination on new search
    try {
      // Use search endpoint for faster results
      const response = await apiService.searchCourses(
        searchQuery.trim(), 
        filters.university,
        filters.department || undefined,
        undefined,
        20
      )
      setSearchResults(response || [])
    } catch {
      setSearchResults([])
    } finally {
      setIsLoading(false)
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
    
    setSelectedSections([...selectedSections, newSelection])
  }

  const removeSection = (index: number) => {
    setSelectedSections(selectedSections.filter((_, i) => i !== index))
  }

  const uniqueCourses = [...new Set(selectedSections.map(section => section.courseCode))]
  const totalCoursesCount = uniqueCourses.length

  const handleGenerateSchedules = async () => {
    if (selectedSections.length === 0) return

    setIsLoading(true)
    try {
      const request = {
        selected_sections: selectedSections.map(s => s.sectionId)
      }
      
      const response = await apiService.generateSchedules(request)
      
      // Store the generated schedules in sessionStorage to pass to schedules page
      sessionStorage.setItem('generatedSchedules', JSON.stringify(response.data))
      sessionStorage.setItem('selectedSections', JSON.stringify(selectedSections))
      
      // Navigate to schedules page
      router.push('/dashboard/schedules')
    } catch (_error) {
      // Handle auth errors through the axios interceptor
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      {/* Header with stats */}
      <div className="mb-6 animate-in fade-in slide-in-from-top duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Generar Horarios</h1>
            <p className="text-muted-foreground">
              Encuentra y selecciona las secciones perfectas para tu horario ideal
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">{selectedSections.length}</div>
              <div className="text-xs text-muted-foreground">Secciones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{totalCoursesCount}</div>
              <div className="text-xs text-muted-foreground">Cursos</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 h-full">
        {/* Search and Filters - Left Columns */}
        <div className="lg:col-span-3 space-y-4 sm:space-y-6">
          <CourseSearchCard 
            filters={filters}
            setFilters={setFilters}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleSearch={handleSearch}
            isLoading={isLoading}
          />

          {/* Search Results */}
          <CourseResultsGrid 
            searchResults={searchResults}
            displayPage={displayPage}
            resultsPerPage={resultsPerPage}
            setSectionPopup={setSectionPopup}
            autocompleteLoading={autocompleteLoading}
            isLoading={isLoading}
            autocompleteError={autocompleteError}
            searchQuery={searchQuery}
          />
        </div>

        {/* Selected Sections - Right Column */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          <SelectedSectionsCard 
            selectedSections={selectedSections}
            groupSectionsByCourse={groupSectionsByCourse}
            collapsedCourses={collapsedCourses}
            toggleCourseCollapse={toggleCourseCollapse}
            removeSection={removeSection}
            handleGenerateSchedules={handleGenerateSchedules}
            isLoading={isLoading}
          />
        </div>

        {/* Section Selection Popup */}
        <SectionSelectionPopup 
          sectionPopup={sectionPopup}
          setSectionPopup={setSectionPopup}
          selectedSections={selectedSections}
          addSection={addSection}
          removeSection={removeSection}
        />
      </div>
    </div>
  )
}