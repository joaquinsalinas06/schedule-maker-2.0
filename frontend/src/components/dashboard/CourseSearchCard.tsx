"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, X, BookOpen } from "lucide-react"
import { Filter } from "@/types"

interface CourseSearchCardProps {
  filters: Filter
  setFilters: (filters: Filter) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  handleSearch?: () => void
  isLoading: boolean
}

export function CourseSearchCard({
  filters,
  setFilters,
  searchQuery,
  setSearchQuery,
  handleSearch,
}: CourseSearchCardProps) {

  const clearAllFilters = () => {
    setSearchQuery("")
    setFilters({
      ...filters,
      department: "",
    })
  }

  const activeFiltersCount = [
    filters.department,
    searchQuery
  ].filter(Boolean).length

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border shadow-xl">
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500" />
            <CardTitle className="text-foreground text-lg sm:text-xl">
              Buscar Cursos
            </CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <CardDescription className="text-muted-foreground text-sm">
          Busca por nombre del curso, código, o profesor
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {/* Career/Department Filter */}
        <div className="w-full">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
            <BookOpen className="w-3 h-3" />
            Carrera / Departamento
          </label>
          <select
            value={filters.department}
            onChange={(e) => setFilters({...filters, department: e.target.value})}
            className="w-full px-3 py-2.5 border rounded-md text-sm bg-background text-foreground border-input focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
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
        </div>

        {/* Unified Search Input */}
        <div className="w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar curso, código, o profesor (ej: Matemática, CS1102, Napa)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch?.()}
              className="w-full text-base sm:text-sm py-2.5 sm:py-2 pl-10"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 px-1">
            Busca en nombres de cursos, códigos y profesores simultáneamente
          </p>
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {searchQuery && (
              <Badge variant="outline" className="text-xs">
                <Search className="w-3 h-3 mr-1" />
                Búsqueda: {searchQuery}
                <X 
                  className="w-3 h-3 ml-1 cursor-pointer hover:text-destructive" 
                  onClick={() => setSearchQuery("")}
                />
              </Badge>
            )}
            {filters.department && (
              <Badge variant="outline" className="text-xs">
                <BookOpen className="w-3 h-3 mr-1" />
                Carrera: {filters.department}
                <X 
                  className="w-3 h-3 ml-1 cursor-pointer hover:text-destructive" 
                  onClick={() => setFilters({...filters, department: ""})}
                />
              </Badge>
            )}
          </div>
        )}
        
        <div className="text-xs sm:text-sm text-muted-foreground px-1">
          Buscando en: <span className="font-medium text-cyan-600">{filters.university}</span>
        </div>
      </CardContent>
    </Card>
  )
}