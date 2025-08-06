"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
        <span className="ml-2 text-muted-foreground">Buscando cursos...</span>
      </div>
    )
  }
  
  if (autocompleteError) {
    return (
      <div className="p-4 text-red-600 text-sm bg-red-50 rounded-md">
        Error: {autocompleteError}
      </div>
    )
  }
  
  if (!searchResults || searchResults.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {searchQuery.length >= 3 ? 
          `No se encontraron cursos para "${searchQuery}"` : 
          searchQuery.length > 0 && searchQuery.length < 3 ?
          'Escribe al menos 3 caracteres para buscar' :
          'Usa la búsqueda para encontrar cursos disponibles.'}
      </div>
    )
  }

  return (
    <div className="space-y-4">
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
                    {course.code} • {course.university?.short_name || 'Universidad'}
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
                    className="bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white border-0 transition-all duration-200 hover:scale-105 hover:shadow-lg"
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
  )
}