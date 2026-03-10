"use client"

import { Button } from "@/components/ui/button"
import { Calendar, ChevronDown, X, BookOpen, Loader2 } from "lucide-react"
import { SelectedSection, GroupedCourse } from "@/types"

interface SelectedSectionsCardProps {
  selectedSections: SelectedSection[]
  groupSectionsByCourse: () => GroupedCourse[]
  collapsedCourses: Set<string>
  toggleCourseCollapse: (courseCode: string) => void
  removeSection: (index: number) => void
  handleGenerateSchedules: () => void
  isLoading: boolean
}

export function SelectedSectionsCard({
  selectedSections,
  groupSectionsByCourse,
  collapsedCourses,
  toggleCourseCollapse,
  removeSection,
  handleGenerateSchedules,
  isLoading
}: SelectedSectionsCardProps) {
  const groupedCourses = groupSectionsByCourse()

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-sm">
            Secciones seleccionadas
          </h3>
          <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">
            {selectedSections.length}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {selectedSections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Busca y selecciona cursos para comenzar
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedCourses.map((courseGroup) => (
              <div 
                key={courseGroup.courseCode} 
                className="rounded-lg border border-border overflow-hidden"
              >
                {/* Course Header */}
                <div 
                  className="flex items-center justify-between px-3 py-2.5 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => courseGroup.sections.length > 1 && toggleCourseCollapse(courseGroup.courseCode)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {courseGroup.courseCode}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {courseGroup.sections.length} seccion{courseGroup.sections.length > 1 ? 'es' : ''}
                    </p>
                  </div>
                  {courseGroup.sections.length > 1 && (
                    <ChevronDown 
                      className={`w-4 h-4 text-muted-foreground transition-transform ${
                        collapsedCourses.has(courseGroup.courseCode) ? 'rotate-180' : ''
                      }`} 
                    />
                  )}
                </div>
                
                {/* Sections List */}
                <div className={`transition-all duration-200 ease-out overflow-hidden ${
                  courseGroup.sections.length === 1 || !collapsedCourses.has(courseGroup.courseCode)
                    ? 'max-h-96 opacity-100'
                    : 'max-h-0 opacity-0'
                }`}>
                  <div className="divide-y divide-border">
                    {courseGroup.sections.map((section) => (
                      <div 
                        key={section.index} 
                        className="flex items-center justify-between px-3 py-2 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">
                            Seccion {section.sectionCode}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {section.professor}
                          </p>
                        </div>
                        <button
                          onClick={() => removeSection(section.index)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Generate Button */}
            <Button 
              className="w-full mt-4" 
              onClick={handleGenerateSchedules}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Generar Horarios
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
