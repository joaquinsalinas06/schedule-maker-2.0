"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
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
  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border shadow-xl">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-foreground text-lg sm:text-xl">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500" />
          Buscar Cursos
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          Encuentra y selecciona las secciones que deseas incluir en tu horario
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {/* Mobile optimized department selector */}
        <div className="w-full">
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

        {/* Mobile optimized search input */}
        <div className="w-full">
          <Input
            placeholder="Buscar por nombre o código del curso..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch?.()}
            className="w-full text-base sm:text-sm py-2.5 sm:py-2"
          />
          <p className="text-xs text-muted-foreground mt-1 px-1">
            Mínimo 3 caracteres para búsqueda automática
          </p>
        </div>
        
        <div className="text-xs sm:text-sm text-muted-foreground px-1">
          Buscando en: <span className="font-medium text-cyan-600">{filters.university}</span>
        </div>
      </CardContent>
    </Card>
  )
}