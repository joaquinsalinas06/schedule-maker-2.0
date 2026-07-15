"use client"

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { searchCourses, getBulkCoursesByIds } from "@/features/catalog";
import { generateSchedules, type BlockingConflict } from "@/features/schedule";
import {
  Course,
  SelectedSection,
  Filter,
  SectionPopupState,
  GroupedCourse,
} from "@/types";
import { useCurriculumStore, getUserCurriculumId } from "@/features/curriculum";

import { CourseSearchCard } from "@/components/dashboard/CourseSearchCard";
import { CourseResultsGrid } from "@/components/dashboard/CourseResultsGrid";
import { SelectedSectionsCard } from "@/components/dashboard/SelectedSectionsCard";
import { SectionSelectionPopup } from "@/components/dashboard/SectionSelectionPopup";
import { CargaHabilModal } from "@/components/dashboard/CargaHabilModal";
import PlannedCoursesBanner from "@/components/dashboard/PlannedCoursesBanner";
import { Upload } from "lucide-react";

const DAY_ES: Record<string, string> = {
  Monday: "Lunes",
  Tuesday: "Martes",
  Wednesday: "Miércoles",
  Thursday: "Jueves",
  Friday: "Viernes",
  Saturday: "Sábado",
  Sunday: "Domingo",
};

export default function GeneratePage() {
  const router = useRouter();

  const [selectedSections, setSelectedSections] = useState<SelectedSection[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [displayPage, setDisplayPage] = useState(1);
  const [resultsPerPage] = useState(10);
  const [sectionPopup, setSectionPopup] = useState<SectionPopupState | null>(
    null,
  );
  const [filters, setFilters] = useState<Filter>({
    university: "UTEC",
    department: "",
    schedule: "",
    modality: "",
  });
  const [collapsedCourses, setCollapsedCourses] = useState<Set<string>>(
    new Set(),
  );
  const [optionalCourses, setOptionalCourses] = useState<Set<string>>(
    new Set(),
  );
  const [maxOptionalCourses, setMaxOptionalCourses] = useState<number>(1);
  const [curriculumFilterEnabled, setCurriculumFilterEnabled] = useState(false);
  const [isCargaHabilModalOpen, setIsCargaHabilModalOpen] = useState(false);
  const [blockingConflicts, setBlockingConflicts] = useState<BlockingConflict[] | null>(null);

  // Curriculum integration
  const { curriculum, unlockedCourseDbIds, fetchProgress, fetchCurriculum, getPlannedCoursesForPeriod, getCurrentPeriod } = useCurriculumStore();
  const [curriculumId, setCurriculumId] = useState<number | null>(null);
  const hasCurriculum = curriculumId != null;

  useEffect(() => {
    getUserCurriculumId().then(setCurriculumId).catch(() => setCurriculumId(null));
  }, []);

  // Planned courses for current period
  const currentPeriod = getCurrentPeriod();
  const plannedForCurrentPeriod = useMemo(
    () => getPlannedCoursesForPeriod(currentPeriod),
    [currentPeriod, getPlannedCoursesForPeriod, curriculum]
  );

  useEffect(() => {
    if (curriculumId != null) {
      if (!curriculum) {
        fetchCurriculum(curriculumId);
      } else {
        fetchProgress(curriculumId);
      }
    }
  }, [curriculumId, curriculum, fetchCurriculum, fetchProgress]);

  // Filter search results by unlocked courses when curriculum filter is enabled
  const filteredSearchResults = useMemo(() => {
    if (!curriculumFilterEnabled || unlockedCourseDbIds.length === 0) {
      return searchResults;
    }
    return searchResults.filter((course) =>
      unlockedCourseDbIds.includes(course.id),
    );
  }, [searchResults, curriculumFilterEnabled, unlockedCourseDbIds]);

  const groupSectionsByCourse = (): GroupedCourse[] => {
    const grouped = selectedSections.reduce(
      (acc, section, index) => {
        const courseCode = section.courseCode;
        if (!acc[courseCode]) {
          acc[courseCode] = {
            courseName: section.courseName,
            courseCode: section.courseCode,
            sections: [],
          };
        }
        acc[courseCode].sections.push({ ...section, index });
        return acc;
      },
      {} as Record<string, GroupedCourse>,
    );

    return Object.values(grouped);
  };

  const toggleCourseCollapse = (courseCode: string) => {
    const newCollapsed = new Set(collapsedCourses);
    if (newCollapsed.has(courseCode)) {
      newCollapsed.delete(courseCode);
    } else {
      newCollapsed.add(courseCode);
    }
    setCollapsedCourses(newCollapsed);
  };

  const toggleCourseOptional = (courseCode: string) => {
    const newOptional = new Set(optionalCourses);
    if (newOptional.has(courseCode)) {
      newOptional.delete(courseCode);
      if (newOptional.size < maxOptionalCourses) {
        setMaxOptionalCourses(Math.max(1, newOptional.size));
      }
    } else {
      newOptional.add(courseCode);
      if (newOptional.size === 1) {
        setMaxOptionalCourses(1);
      }
    }
    setOptionalCourses(newOptional);
  };

  useEffect(() => {
    const hasActiveFilters = searchQuery.length >= 3 || filters.department;

    if (hasActiveFilters) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        handleSearch();
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
      setSearchResults([]);
    }
  }, [filters.department, searchQuery]);

  const handleSearch = async () => {
    if (!searchQuery.trim() && !filters.department) return;

    setIsLoading(true);
    setDisplayPage(1);
    try {
      const response = await searchCourses(
        searchQuery.trim(),
        filters.university,
        filters.department || undefined,
        undefined,
        20,
      );
      setSearchResults(response || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addSection = (course: Course, sectionId: number) => {
    const section = course.sections.find((s) => s.id === sectionId);
    if (!section) return;

    const newSelection: SelectedSection = {
      sectionId: section.id,
      courseId: course.id,
      courseCode: course.code,
      courseName: course.name,
      sectionCode: section.section_number,
      professor: section.professor,
      sessions: section.sessions,
    };

    setSelectedSections((prev) => {
      const alreadySelected = prev.some((s) => s.sectionId === section.id);
      if (alreadySelected) return prev;
      return [...prev, newSelection];
    });
  };

  const removeSection = (index: number) => {
    setSelectedSections((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCargaHabilImport = (courses: Course[]) => {
    setSelectedSections((prev) => {
      let newSelected = [...prev];
      courses.forEach((course) => {
        // Automatically open the course visually if not already by un-collapsing if needed later
        // or just let them manage it
        course.sections.forEach((section) => {
          const alreadySelected = newSelected.some(
            (s) => s.sectionId === section.id,
          );
          if (!alreadySelected) {
            newSelected.push({
              sectionId: section.id,
              courseId: course.id,
              courseCode: course.code,
              courseName: course.name,
              sectionCode: section.section_number,
              professor: section.professor,
              sessions: section.sessions,
            });
          }
        });
      });
      return newSelected;
    });
  };

  const handlePlannedCoursesImport = async (plannedCourses: any[]) => {
    console.log("[handlePlannedCoursesImport] Starting with planned courses:", plannedCourses);
    setIsLoading(true);
    try {
      // Separate IDs and Names for bulk fetch
      const idsToFetch: number[] = [];
      const namesToFetch: string[] = [];
      
      plannedCourses.forEach(c => {
         console.log("[handlePlannedCoursesImport] Processing course:", c);
         if (c.linked_course_id) idsToFetch.push(c.linked_course_id);
         
         // Always pass the name as a safe fallback in case the ID is broken or inactive
         if (c.course_name) namesToFetch.push(c.course_name);
      });
      
      console.log("[handlePlannedCoursesImport] IDs to fetch:", idsToFetch);
      console.log("[handlePlannedCoursesImport] Names to fetch:", namesToFetch);
      
      // Fetch bulk course details
      const courses = await getBulkCoursesByIds(idsToFetch, namesToFetch);
      console.log("[handlePlannedCoursesImport] Received courses from API:", courses);

      // Select all available sections of each course
      setSelectedSections((prev) => {
        let newSelected = [...prev];
        courses.forEach((course) => {
          if (course.sections && course.sections.length > 0) {
            course.sections.forEach((section) => {
              const alreadySelected = newSelected.some(
                (s) => s.sectionId === section.id
              );
              if (!alreadySelected) {
                newSelected.push({
                  sectionId: section.id,
                  courseId: course.id,
                  courseCode: course.code,
                  courseName: course.name,
                  sectionCode: section.section_number,
                  professor: section.professor,
                  sessions: section.sessions,
                });
              }
            });
          }
        });
        console.log("[handlePlannedCoursesImport] Final selected sections state will be:", newSelected);
        return newSelected;
      });
      
    } catch (error) {
      console.error("[handlePlannedCoursesImport] Error importing planned courses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const uniqueCourses = [
    ...new Set(selectedSections.map((section) => section.courseCode)),
  ];
  const totalCoursesCount = uniqueCourses.length;

  const handleGenerateSchedules = async () => {
    if (selectedSections.length === 0) return;

    setIsLoading(true);
    setBlockingConflicts(null);
    try {
      const result = generateSchedules({
        selectedSections,
        optionalCourses,
        maxOptionalCourses,
      });

      if (result.total_combinations === 0) {
        // Stay on the page and explain instead of navigating to an empty list.
        setBlockingConflicts(result.blocking_conflicts ?? []);
        return;
      }

      sessionStorage.setItem(
        "generatedSchedules",
        JSON.stringify(result),
      );
      sessionStorage.setItem(
        "selectedSections",
        JSON.stringify(selectedSections),
      );
      sessionStorage.setItem(
        "optionalCourses",
        JSON.stringify(Array.from(optionalCourses)),
      );
      sessionStorage.setItem(
        "maxOptionalCourses",
        maxOptionalCourses.toString(),
      );

      router.push("/dashboard/schedules");
    } catch (error) {
      console.error("Error generating schedules:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-3">
              Generar Horarios
              <button
                onClick={() => setIsCargaHabilModalOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors mt-0.5"
                title="Importar desde PDF de Carga Hábil"
              >
                <Upload className="w-4 h-4" />
                Carga Hábil
              </button>
            </h1>
            <p className="text-sm text-muted-foreground">
              Busca y selecciona cursos para crear tu horario
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">
                {selectedSections.length}
              </p>
              <p className="text-xs text-muted-foreground">secciones</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">
                {totalCoursesCount}
              </p>
              <p className="text-xs text-muted-foreground">cursos</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100%-73px)] relative z-0">
        {/* Left Panel - Search & Results */}
        <div className="flex-1 overflow-y-auto p-6 border-r border-border bg-muted/5 transition-colors">
          <div className="max-w-3xl space-y-6">
            <CourseSearchCard
              filters={filters}
              setFilters={setFilters}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              handleSearch={handleSearch}
              isLoading={isLoading}
              hasCurriculum={hasCurriculum}
              curriculumFilterEnabled={curriculumFilterEnabled}
              onCurriculumFilterToggle={() =>
                setCurriculumFilterEnabled((v) => !v)
              }
            />

            <CourseResultsGrid
              searchResults={filteredSearchResults}
              displayPage={displayPage}
              resultsPerPage={resultsPerPage}
              setSectionPopup={setSectionPopup}
              autocompleteLoading={false}
              isLoading={isLoading}
              autocompleteError={null}
              searchQuery={searchQuery}
            />
          </div>
        </div>

        {/* Right Panel - Selected Sections & Planned Courses */}
        <div className="w-80 flex-shrink-0 overflow-y-auto p-6 hidden lg:block">
          <div className="space-y-6">
            {plannedForCurrentPeriod.length > 0 && (
              <PlannedCoursesBanner
                period={currentPeriod}
                courses={plannedForCurrentPeriod}
                onImportAll={handlePlannedCoursesImport}
                isLoading={isLoading}
              />
            )}
            
            <SelectedSectionsCard
              selectedSections={selectedSections}
              groupSectionsByCourse={groupSectionsByCourse}
              collapsedCourses={collapsedCourses}
              toggleCourseCollapse={toggleCourseCollapse}
              removeSection={removeSection}
              handleGenerateSchedules={handleGenerateSchedules}
              isLoading={isLoading}
              optionalCourses={optionalCourses}
              toggleCourseOptional={toggleCourseOptional}
              maxOptionalCourses={maxOptionalCourses}
              setMaxOptionalCourses={setMaxOptionalCourses}
            />
          </div>
        </div>
      </div>

      {/* Zero-results explanation */}
      {blockingConflicts !== null && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 w-[min(40rem,calc(100vw-2rem))]">
          <div className="rounded-lg border border-destructive/40 bg-background shadow-lg p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-destructive">
                No se puede generar ningún horario con esta selección
              </p>
              <button
                onClick={() => setBlockingConflicts(null)}
                className="text-muted-foreground hover:text-foreground text-sm"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            {blockingConflicts.length > 0 ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                {blockingConflicts.map((c, i) => (
                  <li key={i}>
                    <span className="text-foreground font-medium">{c.courseA}</span> (Sección {c.example.sectionA}){" "}
                    siempre choca con{" "}
                    <span className="text-foreground font-medium">{c.courseB}</span> (Sección {c.example.sectionB}):{" "}
                    {DAY_ES[c.example.day] ?? c.example.day} {c.example.startA}–{c.example.endA} vs {c.example.startB}–{c.example.endB}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Los cruces involucran a más de dos cursos a la vez. Marca algunos cursos como
                opcionales o quita alguno para encontrar combinaciones válidas.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Quita uno de los cursos en conflicto o márcalo como opcional.
            </p>
          </div>
        </div>
      )}

      {/* Mobile Selected Sections (shown as floating panel) */}
      {selectedSections.length > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-20">
          <SelectedSectionsCard
            selectedSections={selectedSections}
            groupSectionsByCourse={groupSectionsByCourse}
            collapsedCourses={collapsedCourses}
            toggleCourseCollapse={toggleCourseCollapse}
            removeSection={removeSection}
            handleGenerateSchedules={handleGenerateSchedules}
            isLoading={isLoading}
            optionalCourses={optionalCourses}
            toggleCourseOptional={toggleCourseOptional}
            maxOptionalCourses={maxOptionalCourses}
            setMaxOptionalCourses={setMaxOptionalCourses}
          />
        </div>
      )}

      {/* Section Selection Popup */}
      <SectionSelectionPopup
        sectionPopup={sectionPopup}
        setSectionPopup={setSectionPopup}
        selectedSections={selectedSections}
        addSection={addSection}
        removeSection={removeSection}
      />

      {/* Carga Habil Modal */}
      <CargaHabilModal
        isOpen={isCargaHabilModalOpen}
        onClose={() => setIsCargaHabilModalOpen(false)}
        onImportComplete={handleCargaHabilImport}
      />
    </div>
  );
}
