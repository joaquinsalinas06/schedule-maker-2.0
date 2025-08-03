"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, X } from "lucide-react"
import { SectionPopupState, SelectedSection, Section, Session } from "@/types"

interface SectionSelectionPopupProps {
  sectionPopup: SectionPopupState | null
  setSectionPopup: (popup: SectionPopupState | null) => void
  selectedSections: SelectedSection[]
  addSection: (course: any, sectionId: number) => void
  removeSection: (index: number) => void
}

export function SectionSelectionPopup({
  sectionPopup,
  setSectionPopup,
  selectedSections,
  addSection,
  removeSection
}: SectionSelectionPopupProps) {
  if (!sectionPopup) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="bg-card border-border shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <CardHeader className="border-b border-border">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-foreground">{sectionPopup.course.name}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {sectionPopup.course.code}
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSectionPopup(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500 scrollbar-track-transparent">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-foreground">Selecciona las secciones que te interesan:</h4>
                <div className="text-sm text-muted-foreground">
                  {selectedSections.filter(s => s.courseCode === sectionPopup.course.code).length} de {sectionPopup.course.sections?.length || 0} seleccionadas
                </div>
              </div>
              {sectionPopup.course.sections?.map((section: Section) => {
                const isSelected = selectedSections.some(s => s.sectionId === section.id);
                const selectedIndex = selectedSections.findIndex(s => s.sectionId === section.id);
                
                return (
                  <div key={section.id} className={`flex items-center justify-between p-4 border rounded-lg transition-all duration-200 ${
                    isSelected 
                      ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20' 
                      : 'border-border bg-muted/30 hover:bg-muted/50'
                  }`}>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">Sección {section.section_number}</div>
                      <div className="text-sm text-muted-foreground">
                        Prof. {section.professor} • {section.enrolled}/{section.capacity} estudiantes
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {section.sessions?.map((session, idx: number) => (
                          <div key={idx} className="inline-block mr-3 mb-1">
                            <span className={`px-2 py-1 rounded text-xs ${
                              isSelected 
                                ? 'bg-cyan-200 dark:bg-cyan-800 text-cyan-800 dark:text-cyan-200'
                                : 'bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200'
                            }`}>
                              {(() => {
                                const dayMap: Record<string, string> = {
                                  'Monday': 'Lun', 'Tuesday': 'Mar', 'Wednesday': 'Mié', 
                                  'Thursday': 'Jue', 'Friday': 'Vie', 'Saturday': 'Sáb', 'Sunday': 'Dom'
                                };
                                // Handle different possible day formats
                                const dayValue = (session as any).day || (session as Session).day_of_week;
                                const dayKey = typeof dayValue === 'string' ? dayValue : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayValue] || 'Monday';
                                return dayMap[dayKey as keyof typeof dayMap] || dayValue;
                              })()} {session.start_time?.slice(0,5)}-{session.end_time?.slice(0,5)}
                            </span>
                          </div>
                        )) || <span className="text-muted-foreground">Sin horarios definidos</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <span className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                          ✓ Seleccionada
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant={isSelected ? "destructive" : "default"}
                        className={isSelected ? 
                          "bg-red-500 hover:bg-red-600 text-white border-0" :
                          "bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white border-0"
                        }
                        onClick={() => {
                          if (isSelected) {
                            removeSection(selectedIndex);
                          } else {
                            addSection(sectionPopup.course, section.id);
                          }
                        }}
                      >
                        {isSelected ? (
                          <>
                            <X className="w-4 h-4 mr-1" />
                            Quitar
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-1" />
                            Agregar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
        <div className="p-6 border-t border-border bg-muted/20">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {selectedSections.filter(s => s.courseCode === sectionPopup.course.code).length} secciones seleccionadas de este curso
            </div>
            <Button
              onClick={() => setSectionPopup(null)}
              className="bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white border-0"
            >
              Listo
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}