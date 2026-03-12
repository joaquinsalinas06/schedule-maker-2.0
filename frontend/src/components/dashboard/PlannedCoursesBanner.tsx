"use client";

import { CalendarClock, Download } from "lucide-react";
import type { CurriculumCourse } from "@/types/curriculum";

interface PlannedCoursesBannerProps {
  period: string;
  courses: CurriculumCourse[];
  onImportAll: (courses: CurriculumCourse[]) => void;
  isLoading?: boolean;
}

export default function PlannedCoursesBanner({
  period,
  courses,
  onImportAll,
  isLoading = false
}: PlannedCoursesBannerProps) {
  if (courses.length === 0) return null;

  const validCoursesToImport = courses.filter(
    (c) => c.linked_course_id !== null || !c.is_elective
  );

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3 mb-4 shadow-sm">
      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
        <CalendarClock className="w-4 h-4 text-primary" />
        <p className="text-sm font-medium text-foreground">
          Cursos Planificados: {period}
        </p>
      </div>

      <div className="space-y-1.5">
        {courses.map((course) => (
          <div
            key={course.id}
            className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-muted/50 transition-colors"
          >
            <div className="flex flex-col min-w-0 flex-1">
               <span className="text-xs font-medium text-foreground truncate">
                 {course.course_name}
               </span>
               <span className="text-[10px] text-muted-foreground truncate">
                 {course.is_elective ? (course.linked_course_id ? 'Vinculado' : 'Electivo (Sin vincular)') : 'Obligatorio'}
               </span>
            </div>
          </div>
        ))}
      </div>

      {validCoursesToImport.length > 0 && (
        <button
          onClick={() => onImportAll(validCoursesToImport)}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 py-2 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          <Download className="w-3.5 h-3.5" />
          {isLoading ? "Buscando..." : "Buscar todos los cursos"}
        </button>
      )}
    </div>
  );
}
