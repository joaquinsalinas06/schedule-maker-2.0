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
    university: "UTEC",
    department: "",
    schedule: "",
    modality: "",
  })
  const [collapsedCourses, setCollapsedCourses] = useState<Set<string>>(new Set())
  
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

  const toggleCourseCollapse = (courseCode: string) => {
    const newCollapsed = new Set(collapsedCourses)
    if (newCollapsed.has(courseCode)) {
      newCollapsed.delete(courseCode)
    } else {
      newCollapsed.add(courseCode)
    }
    setCollapsedCourses(newCollapsed)
  }

  useEffect(() => {
    const hasActiveFilters = searchQuery.length >= 3 || filters.department
    
    if (hasActiveFilters) {
      const timer = setTimeout(() => {
        handleSearch()
      }, 300)
      
      return () => clearTimeout(timer)
    } else {
      setSearchResults([])
    }
  }, [filters.department, searchQuery])

  useEffect(() => {
    if (autocompleteSuggestions.length > 0 && autocompleteQuery.length >= 3) {
      setSearchResults(autocompleteSuggestions)
    } else if (autocompleteQuery.length === 0) {
      setSearchResults([])
    }
  }, [autocompleteSuggestions, autocompleteQuery])

  useEffect(() => {
    setAutocompleteQuery(searchQuery)
  }, [searchQuery, setAutocompleteQuery])

  const handleSearch = async () => {
    if (!searchQuery.trim() && !filters.department) return
    
    setIsLoading(true)
    setDisplayPage(1)
    try {
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
      
      sessionStorage.setItem('generatedSchedules', JSON.stringify(response.data))
      sessionStorage.setItem('selectedSections', JSON.stringify(selectedSections))
      
      router.push('/dashboard/schedules')
    } catch (error) {
      console.error('Error generating schedules:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Generar Horarios</h1>
            <p className="text-sm text-muted-foreground">Busca y selecciona cursos para crear tu horario</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">{selectedSections.length}</p>
              <p className="text-xs text-muted-foreground">secciones</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">{totalCoursesCount}</p>
              <p className="text-xs text-muted-foreground">cursos</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100%-73px)]">
        {/* Left Panel - Search & Results */}
        <div className="flex-1 overflow-y-auto p-6 border-r border-border">
          <div className="max-w-3xl space-y-6">
            <CourseSearchCard 
              filters={filters}
              setFilters={setFilters}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              handleSearch={handleSearch}
              isLoading={isLoading}
            />

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
        </div>

        {/* Right Panel - Selected Sections */}
        <div className="w-80 flex-shrink-0 overflow-y-auto p-6 hidden lg:block">
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
      </div>

      {/* Mobile Selected Sections (shown as floating panel) */}
      {selectedSections.length > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-20">
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
      )}

      {/* Section Selection Popup */}
      <SectionSelectionPopup 
        sectionPopup={sectionPopup}
        setSectionPopup={setSectionPopup}
        selectedSections={selectedSections}
        addSection={addSection}
        removeSection={removeSection}
      />
    </div>
  )
}
