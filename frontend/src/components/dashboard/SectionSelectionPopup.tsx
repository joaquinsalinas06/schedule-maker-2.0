"use client"

import { Button } from "@/components/ui/button"
import { Plus, X, Check } from "lucide-react"
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

  const selectedCount = selectedSections.filter(s => s.courseCode === sectionPopup.course.code).length

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-lg max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground truncate">{sectionPopup.course.name}</h2>
            <p className="text-sm text-muted-foreground">{sectionPopup.course.code}</p>
          </div>
          <button
            onClick={() => setSectionPopup(null)}
            className="p-1.5 -mr-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {sectionPopup.course.sections?.map((section: Section) => {
              const isSelected = selectedSections.some(s => s.sectionId === section.id)
              const selectedIndex = selectedSections.findIndex(s => s.sectionId === section.id)
              
              return (
                <div 
                  key={section.id} 
                  className={`rounded-lg border p-4 transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/30 hover:bg-muted/30'
                  }`}
                  onClick={() => {
                    if (isSelected) {
                      removeSection(selectedIndex)
                    } else {
                      addSection(sectionPopup.course, section.id)
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">
                          Seccion {section.section_number}
                        </span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                            <Check className="w-3 h-3" />
                            Seleccionada
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {section.professor}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {section.sessions?.map((session, idx: number) => {
                          const dayMap: Record<string, string> = {
                            'Monday': 'Lun', 'Tuesday': 'Mar', 'Wednesday': 'Mie', 
                            'Thursday': 'Jue', 'Friday': 'Vie', 'Saturday': 'Sab', 'Sunday': 'Dom'
                          }
                          const dayValue = (session as any).day || (session as Session).day_of_week
                          const dayKey = typeof dayValue === 'string' ? dayValue : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayValue] || 'Monday'
                          const dayName = dayMap[dayKey as keyof typeof dayMap] || dayValue
                          
                          return (
                            <span 
                              key={idx} 
                              className="inline-flex items-center px-2 py-1 rounded text-xs bg-secondary text-secondary-foreground"
                            >
                              {dayName} {session.start_time?.slice(0,5)}-{session.end_time?.slice(0,5)}
                            </span>
                          )
                        }) || <span className="text-xs text-muted-foreground">Sin horarios definidos</span>}
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant={isSelected ? "destructive" : "default"}
                      className="flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isSelected) {
                          removeSection(selectedIndex)
                        } else {
                          addSection(sectionPopup.course, section.id)
                        }
                      }}
                    >
                      {isSelected ? (
                        <>
                          <X className="w-3.5 h-3.5 mr-1" />
                          Quitar
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Agregar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/20">
          <p className="text-sm text-muted-foreground">
            {selectedCount} {selectedCount === 1 ? 'seccion seleccionada' : 'secciones seleccionadas'}
          </p>
          <Button onClick={() => setSectionPopup(null)}>
            Listo
          </Button>
        </div>
      </div>
    </div>
  )
}
