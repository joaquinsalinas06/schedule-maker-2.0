"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Zap, Clock, Eye, EyeOff, Loader2 } from "lucide-react";
import { ScheduleVisualization } from "@/components/ScheduleVisualization";
import { ButtonLoader } from "@/components/ui/loading-skeletons";

interface CollaborativeCourseSelection {
  id?: number;
  course_code: string;
  course_name: string;
  section_code: string;
  professor?: string;
  schedule_data: any;
  selection_type: "shared" | "individual";
  shared_with_users: number[];
  priority: number;
  added_by: number;
  is_active: boolean;
}

interface ScheduleGenerationSectionProps {
  courseSelections: CollaborativeCourseSelection[];
  loading: boolean;
  generateSchedules: () => Promise<void>;
  generatedSchedule: any;
  showScheduleVisualization: boolean;
  setShowScheduleVisualization: (show: boolean) => void;
  conflicts: any[];
  getSharedCourses: () => CollaborativeCourseSelection[];
  getIndividualCourses: () => CollaborativeCourseSelection[];
}

export function ScheduleGenerationSection({
  courseSelections,
  loading,
  generateSchedules,
  generatedSchedule,
  showScheduleVisualization,
  setShowScheduleVisualization,
  conflicts,
  getSharedCourses,
  getIndividualCourses,
}: ScheduleGenerationSectionProps) {
  return (
    <>
      {/* Personal Schedule Generation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Generación de Horario Personal
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Genera tu horario personalizado combinando cursos compartidos e
            individuales
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {courseSelections.length === 0 ? (
            <div className="text-center text-muted-foreground py-6">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium">
                Selecciona cursos para generar horarios
              </p>
              <p className="text-sm">
                Necesitas al menos un curso para generar un horario
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-medium mb-2">Resumen de tu selección:</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-primary">
                      {getSharedCourses().length}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      cursos compartidos
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-primary">
                      {getIndividualCourses().length}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      cursos individuales
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      {courseSelections.length}
                    </span>
                    <span className="text-muted-foreground"> total</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={generateSchedules}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {loading ? (
                  <>
                    <ButtonLoader />
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Generar Mi Horario
                  </>
                )}
              </Button>

              {conflicts.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h4 className="font-medium text-red-800 mb-1">
                    Conflictos detectados:
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {conflicts.map((conflict, index) => (
                      <li key={index}>
                        • {conflict.message || "Conflicto de horario"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Schedule Visualization */}
      {generatedSchedule && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Tu Horario Generado
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Tu horario personalizado colaborativo con{" "}
                  {generatedSchedule.selected_courses_count} cursos
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setShowScheduleVisualization(!showScheduleVisualization)
                }
              >
                {showScheduleVisualization ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Ocultar Horario
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Mostrar Horario
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {showScheduleVisualization && (
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-foreground">
                      {getSharedCourses().length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Compartidos
                    </div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-foreground">
                      {getIndividualCourses().length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Individuales
                    </div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-foreground">
                      {generatedSchedule.selected_courses_count}
                    </div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center p-3 bg-destructive/10 rounded-lg">
                    <div className="text-2xl font-bold text-destructive">
                      {conflicts.length}
                    </div>
                    <div className="text-sm text-destructive">Conflictos</div>
                  </div>
                </div>

                {/* Schedule Canvas Visualization */}
                <ScheduleVisualization
                  scheduleData={generatedSchedule}
                  showBackButton={false}
                />
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </>
  );
}
