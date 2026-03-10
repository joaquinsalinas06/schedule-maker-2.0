"use client"

import { Button } from "@/components/ui/button"
import { Plus, Loader2, AlertCircle, Search } from "lucide-react"
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
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Buscando cursos...</span>
        </div>
      </div>
    )
  }
  
  if (autocompleteError) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm">{autocompleteError}</p>
      </div>
    )
  }
  
  if (!searchResults || searchResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Search className="w-5 h-5 text-muted-foreground" />
        </div>
        {searchQuery.length >= 3 ? (
          <>
            <p className="text-foreground font-medium mb-1">Sin resultados</p>
            <p className="text-sm text-muted-foreground">
              No encontramos cursos para "{searchQuery}"
            </p>
          </>
        ) : searchQuery.length > 0 ? (
          <>
            <p className="text-foreground font-medium mb-1">Continua escribiendo</p>
            <p className="text-sm text-muted-foreground">
              Escribe al menos 3 caracteres para buscar
            </p>
          </>
        ) : (
          <>
            <p className="text-foreground font-medium mb-1">Busca un curso</p>
            <p className="text-sm text-muted-foreground">
              Usa el buscador para encontrar cursos disponibles
            </p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {searchResults
        .slice((displayPage - 1) * resultsPerPage, displayPage * resultsPerPage)
        .map((course) => (
          <div 
            key={course.id} 
            className="group flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors"
          >
            <div className="flex-1 min-w-0 mr-4">
              <h3 className="font-medium text-foreground truncate">
                {course.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">{course.code}</span>
                <span className="text-muted-foreground">-</span>
                <span className="text-sm text-muted-foreground">
                  {course.sections?.length || 0} secciones
                </span>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSectionPopup({courseId: course.id, course})}
              className="flex-shrink-0 h-8 gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Seleccionar
            </Button>
          </div>
        ))
      }
    </div>
  )
}
