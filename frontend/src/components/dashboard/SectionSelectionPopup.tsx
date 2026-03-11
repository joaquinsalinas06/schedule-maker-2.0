"use client"

import { Button } from "@/components/ui/button"
import { Plus, X, Check, Minus } from "lucide-react"
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

  const selectedCount = selectedSections.filter(
    (s) => s.courseCode === sectionPopup.course.code,
  ).length

  const sortedSections = [...(sectionPopup.course.sections || [])].sort(
    (a: Section, b: Section) => {
      const aNumber = Number(a.section_number)
      const bNumber = Number(b.section_number)

      if (!Number.isNaN(aNumber) && !Number.isNaN(bNumber)) {
        return aNumber - bNumber
      }

      return String(a.section_number).localeCompare(String(b.section_number))
    },
  )

  const selectedIndexesForCourse = selectedSections
    .map((section, index) => ({ section, index }))
    .filter(({ section }) => section.courseCode === sectionPopup.course.code)
    .map(({ index }) => index)

  const allSectionsSelected =
    sortedSections.length > 0 && selectedIndexesForCourse.length === sortedSections.length

  const handleToggleAll = () => {
    if (allSectionsSelected) {
      // Remove from end to start to keep indexes stable while deleting.
      const indexesDescending = [...selectedIndexesForCourse].sort((a, b) => b - a)
      indexesDescending.forEach((index) => removeSection(index))
      return
    }

    const selectedIds = new Set(
      selectedSections
        .filter((s) => s.courseCode === sectionPopup.course.code)
        .map((s) => s.sectionId),
    )

    sortedSections.forEach((section) => {
      if (!selectedIds.has(section.id)) {
        addSection(sectionPopup.course, section.id)
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-lg max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground truncate">
              {sectionPopup.course.name}
            </h2>
            <p className="text-sm text-muted-foreground">{sectionPopup.course.code}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleAll}
              className="h-8 px-3 text-xs"
            >
              {allSectionsSelected ? "Quitar todas" : "Seleccionar todas"}
            </Button>
            <button
              onClick={() => setSectionPopup(null)}
              className="p-1.5 -mr-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-0">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-3 font-medium">Sec</th>
                <th className="px-6 py-3 font-medium">Profesor</th>
                <th className="px-6 py-3 font-medium">Horarios</th>
                <th className="px-6 py-3 font-medium text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedSections.map((section: Section) => {
                const isSelected = selectedSections.some(
                  (s) => s.sectionId === section.id,
                );
                const selectedIndex = selectedSections.findIndex(
                  (s) => s.sectionId === section.id,
                );

                return (
                  <tr
                    key={section.id}
                    className={`transition-colors hover:bg-muted/40 cursor-pointer ${
                      isSelected ? "bg-primary/5" : ""
                    }`}
                    onClick={() => {
                      if (isSelected) {
                        removeSection(selectedIndex);
                      } else {
                        addSection(sectionPopup.course, section.id);
                      }
                    }}
                  >
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {section.section_number}
                        </span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {section.professor || "-"}
                      </p>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col gap-1">
                        {section.sessions?.map((session, idx: number) => {
                          const dayMap: Record<string, string> = {
                            Monday: "Lun",
                            Tuesday: "Mar",
                            Wednesday: "Mie",
                            Thursday: "Jue",
                            Friday: "Vie",
                            Saturday: "Sab",
                            Sunday: "Dom",
                          };
                          const dayValue =
                            (session as any).day ||
                            (session as Session).day_of_week;
                          const dayKey =
                            typeof dayValue === "string"
                              ? dayValue
                              : [
                                  "Monday",
                                  "Tuesday",
                                  "Wednesday",
                                  "Thursday",
                                  "Friday",
                                  "Saturday",
                                  "Sunday",
                                ][dayValue] || "Monday";
                          const dayName =
                            dayMap[dayKey as keyof typeof dayMap] || dayValue;

                          return (
                            <span
                              key={idx}
                              className="text-xs text-muted-foreground whitespace-nowrap"
                            >
                              <span className="font-medium text-foreground">
                                {dayName}
                              </span>{" "}
                              {session.start_time?.slice(0, 5)}-
                              {session.end_time?.slice(0, 5)}
                            </span>
                          );
                        }) || (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Button
                        size="sm"
                        variant={isSelected ? "destructive" : "outline"}
                        className={`h-8 w-8 p-0 ${!isSelected && "hover:border-primary hover:text-primary"}`}
                        aria-label={isSelected ? "Quitar sección" : "Agregar sección"}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSelected) {
                            removeSection(selectedIndex);
                          } else {
                            addSection(sectionPopup.course, section.id);
                          }
                        }}
                      >
                        {isSelected ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/10">
          <p className="text-sm text-foreground font-medium">
            {selectedCount}{" "}
            {selectedCount === 1
              ? "sección seleccionada"
              : "secciones seleccionadas"}
          </p>
          <Button onClick={() => setSectionPopup(null)}>Hecho</Button>
        </div>
      </div>
    </div>
  );
}
