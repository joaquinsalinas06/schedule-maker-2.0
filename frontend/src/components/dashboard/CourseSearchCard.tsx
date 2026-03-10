"use client"

import { Input } from "@/components/ui/input"
import { Search, X, ChevronDown } from "lucide-react"
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

  const clearSearch = () => {
    setSearchQuery("")
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cursos, codigos, o profesores..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch?.()}
          className="pl-10 pr-10 h-10 bg-card border-border"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <select
            value={filters.department}
            onChange={(e) => setFilters({...filters, department: e.target.value})}
            className="w-full h-9 pl-3 pr-8 text-sm bg-card border border-border rounded-md appearance-none cursor-pointer hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          >
            <option value="">Todas las carreras</option>
            <option value="CS">Ciencias de la Computacion</option>
            <option value="DS">Data Science</option>
            <option value="BIO">Bioingenieria</option>
            <option value="IND">Ingenieria Industrial</option>
            <option value="ME">Ingenieria Mecanica</option>
            <option value="CI">Ingenieria Civil</option>
            <option value="EE">Ingenieria Electrica</option>
            <option value="EN">Ingenieria de la Energia</option>
            <option value="EL">Ingenieria Electronica</option>
            <option value="AM">Matematica Aplicada</option>
            <option value="MT">Ingenieria Mecatronica</option>
            <option value="HH">Humanidades</option>
            <option value="CC">Ciencias</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>

        <span className="text-sm text-muted-foreground">
          {filters.university}
        </span>
      </div>

      {/* Active Filters */}
      {(searchQuery || filters.department) && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filtros:</span>
          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
              "{searchQuery}"
              <button onClick={clearSearch} className="hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.department && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
              {filters.department}
              <button onClick={() => setFilters({...filters, department: ""})} className="hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
