"use client"

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiService } from "@/services/api";
import { authService } from "@/services/auth";
import {
  Course,
  SelectedSection,
  Filter,
  SectionPopupState,
  GroupedCourse,
} from "@/types";
import { useCurriculumStore } from "@/stores/curriculumStore";

import { CourseSearchCard } from "@/components/dashboard/CourseSearchCard";
import { CourseResultsGrid } from "@/components/dashboard/CourseResultsGrid";
import { SelectedSectionsCard } from "@/components/dashboard/SelectedSectionsCard";
import { SectionSelectionPopup } from "@/components/dashboard/SectionSelectionPopup";
import { CargaHabilModal } from "@/components/dashboard/CargaHabilModal";
import { Upload } from "lucide-react";

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

  // Curriculum integration
  const { unlockedCourseDbIds, fetchProgress } = useCurriculumStore();
  const currentUser = authService.getCurrentUser();
  const hasCurriculum = !!currentUser?.curriculum_id;

  useEffect(() => {
    if (hasCurriculum && currentUser?.curriculum_id) {
      fetchProgress(currentUser.curriculum_id);
    }
  }, [hasCurriculum, currentUser?.curriculum_id, fetchProgress]);

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
      const response = await apiService.searchCourses(
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

  const uniqueCourses = [
    ...new Set(selectedSections.map((section) => section.courseCode)),
  ];
  const totalCoursesCount = uniqueCourses.length;

  const handleGenerateSchedules = async () => {
    if (selectedSections.length === 0) return;

    setIsLoading(true);
    try {
      // Split sections into required vs optional
      const requiredSections = selectedSections
        .filter((s) => !optionalCourses.has(s.courseCode))
        .map((s) => s.sectionId);
      const optionalSectionIds = selectedSections
        .filter((s) => optionalCourses.has(s.courseCode))
        .map((s) => s.sectionId);

      const request = {
        selected_sections: requiredSections,
        optional_sections:
          optionalSectionIds.length > 0 ? optionalSectionIds : undefined,
        max_optional_courses:
          optionalSectionIds.length > 0 ? maxOptionalCourses : undefined,
        sort_by: "score" as const,
      };

      console.log("Generating schedules with payload:", request);
      console.log(
        "Optional courses limit:",
        maxOptionalCourses,
        "out of",
        optionalCourses.size,
      );

      const response = await apiService.generateSchedules(request);

      sessionStorage.setItem(
        "generatedSchedules",
        JSON.stringify(response.data),
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

        {/* Right Panel - Selected Sections */}
        <div className="w-80 flex-shrink-0 overflow-y-auto p-6 hidden lg:block">
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
