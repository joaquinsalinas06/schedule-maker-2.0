"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Filter } from "@/types"

interface CourseSearchCardProps {
  filters: Filter
  setFilters: (filters: Filter) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  handleSearch: () => void
  isLoading: boolean
}

export function CourseSearchCard({
  filters,
  setFilters,
  searchQuery,
  setSearchQuery,
  handleSearch,
  isLoading
}: CourseSearchCardProps) {
  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Search className="w-5 h-5 text-cyan-500" />
          Buscar Cursos
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Encuentra y selecciona las secciones que deseas incluir en tu horario
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
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
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Buscar por nombre o código del curso... (mín 3 caracteres)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />

        </div>
        
        <div className="text-sm text-muted-foreground">
          Buscando en: <span className="font-medium text-cyan-600">{filters.university}</span>
        </div>
      </CardContent>
    </Card>
  )
}