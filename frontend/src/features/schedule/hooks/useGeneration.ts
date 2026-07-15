// Local replacement for the old POST /api/schedules/generate call. Pure
// compute over data the caller already has in memory (selectedSections carry
// full session data from search/carga-habil/planned-course imports) — no
// network round-trip, works for anonymous users.
import { generateCombinations } from "../logic/scheduleGenerator";
import type { SectionOption } from "../logic/scheduleGenerator";
import { findBlockingConflicts, type BlockingConflict } from "../logic/conflictExplainer";
import type { SelectedSection, ScheduleResponse, ScheduleCombination } from "@/types";
import type { GenerateSchedulesParams } from "../types";

function toSectionOption(s: SelectedSection): SectionOption {
  return {
    section_id: s.sectionId,
    // ponytail: courseId is optional on SelectedSection (older call sites
    // don't set it); falling back to sectionId only affects the course_id
    // field on the generated result, never the collision/scoring logic.
    course_id: s.courseId ?? s.sectionId,
    course_code: s.courseCode,
    course_name: s.courseName,
    section_number: s.sectionCode,
    professor: s.professor,
    sessions: (s.sessions || []).map((session) => {
      // Sessions arrive in two shapes: the legacy REST shape (day_of_week
      // numeric, classroom) and raw Supabase rows (day string, location).
      // Dropping the day silently disables ALL conflict detection, so accept both.
      const raw = session as unknown as { day?: string | number; location?: string; modality?: string };
      return {
        id: session.id,
        session_type: session.session_type,
        day: session.day_of_week ?? raw.day ?? null,
        start_time: session.start_time,
        end_time: session.end_time,
        location: session.classroom ?? raw.location ?? null,
        modality: raw.modality ?? "Presencial",
      };
    }),
  };
}

/** Generate schedule combinations from the user's current section selection. */
export function generateSchedules({
  selectedSections,
  optionalCourses,
  maxOptionalCourses,
  sortBy = "score",
}: GenerateSchedulesParams): ScheduleResponse {
  const sections = selectedSections.map(toSectionOption);

  const requiredSectionIds = selectedSections
    .filter((s) => !optionalCourses.has(s.courseCode))
    .map((s) => s.sectionId);
  const optionalSectionIds = selectedSections
    .filter((s) => optionalCourses.has(s.courseCode))
    .map((s) => s.sectionId);

  const combinations = generateCombinations({
    sections,
    selectedSectionIds: requiredSectionIds,
    optionalSectionIds: optionalSectionIds.length > 0 ? optionalSectionIds : undefined,
    maxOptionalCourses: optionalSectionIds.length > 0 ? (maxOptionalCourses ?? null) : null,
    sortBy,
  });

  // Zero results: tell the user which course pairs make it impossible.
  const blockingConflicts: BlockingConflict[] =
    combinations.length === 0 ? findBlockingConflicts(sections, requiredSectionIds) : [];

  return {
    combinations: combinations as unknown as ScheduleCombination[],
    total_combinations: combinations.length,
    message: combinations.length > 0 ? "OK" : "No valid combinations found",
    blocking_conflicts: blockingConflicts,
  };
}
