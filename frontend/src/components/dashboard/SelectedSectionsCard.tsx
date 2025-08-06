"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Calendar, ChevronDown, X } from "lucide-react"
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
  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-foreground text-base sm:text-lg min-w-0 overflow-hidden">
          <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="hidden sm:inline truncate flex-1 min-w-0">Secciones Seleccionadas</span>
          <span className="sm:hidden truncate flex-1 min-w-0">Seleccionadas</span>
          <span className="text-sm sm:text-base flex-shrink-0">({selectedSections.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 sm:space-y-3">
          {selectedSections.length === 0 ? (
            <div className="text-center py-6 sm:py-4 text-muted-foreground text-sm animate-in fade-in duration-300">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No hay secciones seleccionadas</p>
              <p className="text-xs mt-1 opacity-75">Busca y selecciona cursos arriba</p>
            </div>
          ) : (
            <>
              {groupSectionsByCourse().map((courseGroup, groupIndex) => (
                <div 
                  key={courseGroup.courseCode} 
                  className="border border-border rounded-lg bg-muted/30 animate-in slide-in-from-left duration-300"
                  style={{ animationDelay: `${groupIndex * 50}ms` }}
                >
                  {/* Course Header - Mobile optimized */}
                  <div className="flex items-center justify-between p-2 sm:p-3 transition-all duration-200 hover:bg-muted/40">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm sm:text-sm text-foreground">
                        {courseGroup.courseCode}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-full">
                        {courseGroup.courseName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {courseGroup.sections.length} sección{courseGroup.sections.length > 1 ? 'es' : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      {courseGroup.sections.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleCourseCollapse(courseGroup.courseCode)}
                          className="p-1 hover:bg-muted transition-all duration-200 hover:scale-105 min-w-0"
                        >
                          <ChevronDown 
                            className={`w-3 h-3 sm:w-4 sm:h-4 transition-all duration-300 ease-out ${
                              collapsedCourses.has(courseGroup.courseCode) 
                                ? 'rotate-180 text-muted-foreground' 
                                : 'rotate-0 text-foreground'
                            }`} 
                          />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Sections List with Animation - Mobile optimized */}
                  <div className={`overflow-hidden transition-all duration-300 ease-out ${
                    courseGroup.sections.length === 1 || !collapsedCourses.has(courseGroup.courseCode)
                      ? 'max-h-96 opacity-100'
                      : 'max-h-0 opacity-0'
                  }`}>
                    <div className="border-t border-border bg-muted/20">
                      {courseGroup.sections.map((section, sectionIndex) => (
                        <div 
                          key={section.index} 
                          className="flex items-center justify-between p-2 sm:p-2 border-b border-border/50 last:border-b-0 transition-all duration-200 hover:bg-muted/40 animate-in fade-in slide-in-from-left"
                          style={{ animationDelay: `${sectionIndex * 25}ms` }}
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="text-xs font-medium text-foreground">
                              Sección {section.sectionCode}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              Prof. {section.professor}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeSection(section.index)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1 transition-all duration-200 hover:scale-105 min-w-0 flex-shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
          
          {selectedSections.length > 0 && (
            <Button 
              className="w-full mt-3 sm:mt-4 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white border-0 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg animate-in slide-in-from-bottom duration-500 py-3 sm:py-2" 
              size="lg"
              onClick={handleGenerateSchedules}
              disabled={isLoading}
            >
              <Calendar className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:rotate-12" />
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-sm sm:text-base">Generando...</span>
                </span>
              ) : (
                <span className="text-sm sm:text-base font-medium">Generar Horarios</span>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}