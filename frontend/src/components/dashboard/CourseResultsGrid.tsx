"use client"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Course, SectionPopupState } from "@/types"

interface CourseResultsGridProps {
  searchResults: Course[]
  displayPage: number
  resultsPerPage: number
  setSectionPopup: (popup: SectionPopupState | null) => void
  autocompleteLoading: boolean
  isLoading: boolean
  autocompleteError: string | null
  searchQuery: string
}

export function CourseResultsGrid({
  searchResults,
  displayPage,
  resultsPerPage,
  setSectionPopup,
  autocompleteLoading,
  isLoading,
  autocompleteError,
  searchQuery
}: CourseResultsGridProps) {
  if (autocompleteLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-6 sm:py-8">
        <div className="animate-spin h-6 w-6 sm:h-8 sm:w-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
        <span className="ml-2 text-muted-foreground text-sm sm:text-base">Buscando cursos...</span>
      </div>
    )
  }
  
  if (autocompleteError) {
    return (
      <div className="p-3 sm:p-4 text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-md">
        Error: {autocompleteError}
      </div>
    )
  }
  
  if (!searchResults || searchResults.length === 0) {
    return (
      <div className="text-center py-6 sm:py-8 text-muted-foreground px-4">
        <div className="max-w-md mx-auto">
          {searchQuery.length >= 3 ? 
            <p className="text-sm sm:text-base">No se encontraron cursos para <span className="font-medium">"{searchQuery}"</span></p> : 
            searchQuery.length > 0 && searchQuery.length < 3 ?
            <p className="text-sm sm:text-base">Escribe al menos 3 caracteres para buscar</p> :
            <p className="text-sm sm:text-base">Usa la búsqueda para encontrar cursos disponibles.</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {searchResults
        .slice((displayPage - 1) * resultsPerPage, displayPage * resultsPerPage)
        .map((course, courseIndex) => (
          <Card 
            key={course.id} 
            className="bg-card/80 backdrop-blur-sm border-border shadow-xl hover:shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom"
            style={{ animationDelay: `${courseIndex * 75}ms` }}
          >
            <CardHeader className="p-4 sm:p-6">
              {/* Mobile-first responsive layout */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base sm:text-lg text-foreground leading-tight">
                    {course.name}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-sm mt-1">
                    {course.code} • {course.university?.short_name || 'Universidad'}
                  </CardDescription>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-2">
                    {course.sections?.length || 0} secciones disponibles
                  </div>
                </div>
                <div className="flex gap-2 sm:flex-shrink-0">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSectionPopup({courseId: course.id, course});
                    }}
                    className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white border-0 transition-all duration-200 hover:scale-105 hover:shadow-lg px-3 sm:px-4 py-2 text-xs sm:text-sm"
                  >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 transition-transform duration-200 group-hover:rotate-90" />
                    <span className="sm:inline">Seleccionar Secciones</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))
      }
    </div>
  )
}