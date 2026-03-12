"use client"

import { Button } from "@/components/ui/button"
import {
  Calendar,
  ChevronDown,
  X,
  BookOpen,
  Lock,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ButtonLoader } from "@/components/ui/loading-skeletons";
import { SelectedSection, GroupedCourse } from "@/types";

interface SelectedSectionsCardProps {
  selectedSections: SelectedSection[];
  groupSectionsByCourse: () => GroupedCourse[];
  collapsedCourses: Set<string>;
  toggleCourseCollapse: (courseCode: string) => void;
  removeSection: (index: number) => void;
  handleGenerateSchedules: () => void;
  isLoading: boolean;
  optionalCourses?: Set<string>;
  toggleCourseOptional?: (courseCode: string) => void;
  maxOptionalCourses?: number;
  setMaxOptionalCourses?: (val: number) => void;
  impossibleSections?: Set<number>;
}

export function SelectedSectionsCard({
  selectedSections,
  groupSectionsByCourse,
  collapsedCourses,
  toggleCourseCollapse,
  removeSection,
  handleGenerateSchedules,
  isLoading,
  optionalCourses = new Set(),
  toggleCourseOptional,
  maxOptionalCourses,
  setMaxOptionalCourses,
  impossibleSections,
}: SelectedSectionsCardProps) {
  const groupedCourses = groupSectionsByCourse();

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
            {groupedCourses.map((courseGroup) => {
              const isOptional = optionalCourses.has(courseGroup.courseCode);

              return (
                <div
                  key={courseGroup.courseCode}
                  className={`rounded-lg border overflow-hidden transition-colors ${
                    isOptional
                      ? "border-dashed border-muted-foreground/40"
                      : "border-border"
                  }`}
                >
                  {/* Course Header */}
                  <div
                    className="flex items-center justify-between px-3 py-2.5 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() =>
                      courseGroup.sections.length > 1 &&
                      toggleCourseCollapse(courseGroup.courseCode)
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {!isOptional && (
                          <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-sm font-medium text-foreground truncate cursor-default">
                              {courseGroup.courseName || courseGroup.courseCode}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {courseGroup.courseCode} -{" "}
                              {courseGroup.courseName}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {isOptional ? "Opcional" : "Requerido"} ·{" "}
                        {courseGroup.sections.length} seccion
                        {courseGroup.sections.length > 1 ? "es" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Optional toggle */}
                      {toggleCourseOptional && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCourseOptional(courseGroup.courseCode);
                              }}
                              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {isOptional ? (
                                <ToggleRight className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ToggleLeft className="w-4 h-4" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {isOptional
                                ? "Marcar como requerido"
                                : "Marcar como opcional"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {courseGroup.sections.length > 1 && (
                        <ChevronDown
                          className={`w-4 h-4 text-muted-foreground transition-transform ${
                            collapsedCourses.has(courseGroup.courseCode)
                              ? "rotate-180"
                              : ""
                          }`}
                        />
                      )}
                    </div>
                  </div>

                  {/* Sections List */}
                  <div
                    className={`transition-all duration-200 ease-out ${
                      courseGroup.sections.length === 1 ||
                      !collapsedCourses.has(courseGroup.courseCode)
                        ? "max-h-[250px] overflow-y-auto opacity-100" /* Use standard overflow to enable scrolling */
                        : "max-h-0 overflow-hidden opacity-0"
                    }`}
                  >
                    <div className="divide-y divide-border">
                      {[...courseGroup.sections]
                        .sort((a, b) => {
                          const numA = parseInt(a.sectionCode);
                          const numB = parseInt(b.sectionCode);
                          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                          return String(a.sectionCode).localeCompare(
                            String(b.sectionCode),
                          );
                        })
                        .map((section) => {
                          const isImpossible = impossibleSections?.has(
                            section.sectionId,
                          );
                          return (
                            <div
                              key={section.index}
                              className={`flex items-center justify-between px-3 py-2 transition-colors ${isImpossible ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-muted/20"}`}
                            >
                              <div
                                className={`flex-1 min-w-0 ${isImpossible ? "opacity-60" : ""}`}
                              >
                                <div className="flex items-center gap-2">
                                  <p
                                    className={`text-sm ${isImpossible ? "text-destructive font-medium" : "text-foreground"}`}
                                  >
                                    Seccion {section.sectionCode}
                                  </p>
                                  {isImpossible && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="cursor-help">
                                          <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-[250px] text-center border-destructive/20 bg-destructive/10 text-destructive-foreground">
                                        <p>
                                          Esta sección causa conflictos y no
                                          pudo ser incluida en ningún horario
                                          generado. Sugerimos quitarla.
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                                <p
                                  className={`text-xs truncate ${isImpossible ? "text-destructive/70" : "text-muted-foreground"}`}
                                >
                                  {!section.professor || section.professor.toLowerCase() === 'nan' ? 'No asignado' : section.professor}
                                </p>
                              </div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => removeSection(section.index)}
                                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  <p>Remover sección</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              );
            })}
            {optionalCourses.size > 0 && setMaxOptionalCourses && (
              <div className="flex items-center justify-between px-2 py-2 mt-4 border-t border-border">
                <span className="text-sm text-muted-foreground mr-2">
                  Cursos opcionales a incluir:
                </span>
                <select
                  value={maxOptionalCourses ?? optionalCourses.size}
                  onChange={(e) =>
                    setMaxOptionalCourses(Number(e.target.value))
                  }
                  className="bg-muted text-foreground text-sm rounded px-2 py-1 outline-none appearance-none cursor-pointer hover:bg-muted/80 transition-colors border border-border"
                >
                  {Array.from(
                    { length: optionalCourses.size },
                    (_, i) => i + 1,
                  ).map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? "curso" : "cursos"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button
              className="w-full mt-4"
              onClick={handleGenerateSchedules}
              disabled={isLoading}
            >
              {isLoading ? (
                <ButtonLoader />
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
  );
}
