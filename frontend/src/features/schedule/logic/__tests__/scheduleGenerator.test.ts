import { describe, expect, it } from "vitest";
import {
  generateCombinations,
  type CombinationDict,
  type SectionOption,
  type SortBy,
} from "../scheduleGenerator";
import vectors from "./vectors.json";

interface FixtureCourse {
  id: number;
  code: string;
  name: string;
}

interface FixtureSection {
  id: number;
  course_id: number;
  section_number: string;
  professor: string | null;
  capacity: number;
  enrolled: number;
}

interface FixtureSession {
  id: number;
  section_id: number;
  session_type: string;
  day: string;
  start_time: string;
  end_time: string;
  location: string;
  modality: string;
}

interface Vector {
  name: string;
  fixtures: {
    courses: FixtureCourse[];
    sections: FixtureSection[];
    sessions: Record<string, FixtureSession[]>;
  };
  input: {
    selected_section_ids: number[];
    optional_section_ids: number[];
    max_optional_courses: number | null;
    sort_by: SortBy;
    max_results: number;
  };
  [key: string]: unknown;
}

function buildSections(fixtures: Vector["fixtures"]): SectionOption[] {
  const coursesById = new Map(fixtures.courses.map((c) => [c.id, c]));
  return fixtures.sections.map((section) => {
    const course = coursesById.get(section.course_id)!;
    const sessions = fixtures.sessions[String(section.id)] ?? [];
    return {
      section_id: section.id,
      course_id: section.course_id,
      course_code: course.code,
      course_name: course.name,
      section_number: section.section_number,
      professor: section.professor,
      capacity: section.capacity,
      enrolled: section.enrolled,
      sessions: sessions.map((s) => ({
        id: s.id,
        session_type: s.session_type,
        day: s.day,
        start_time: s.start_time,
        end_time: s.end_time,
        location: s.location,
        modality: s.modality,
      })),
    };
  });
}

function assertMatchesVector(actual: CombinationDict[], expected: any[]) {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expect(actual[i].id_string, `order mismatch at index ${i}`).toBe(expected[i].id_string);
    expect(actual[i].course_count).toBe(expected[i].course_count);
    for (const key of ["earliest", "gaps", "spread", "compactness", "composite"] as const) {
      expect(actual[i].scores[key]).toBeCloseTo(expected[i].scores[key], 3);
    }
  }
}

describe("generateCombinations parity with Python schedule_generator.py", () => {
  const typedVectors = vectors as unknown as Vector[];

  for (const vector of typedVectors) {
    it(`${vector.name}: primary sort matches`, () => {
      const sections = buildSections(vector.fixtures);
      const primaryOutputKey = Object.keys(vector).find((k) => k.startsWith("output_sort_") && k === `output_sort_${vector.input.sort_by}`)!;
      const result = generateCombinations({
        sections,
        selectedSectionIds: vector.input.selected_section_ids,
        optionalSectionIds: vector.input.optional_section_ids,
        maxOptionalCourses: vector.input.max_optional_courses,
        sortBy: vector.input.sort_by,
        maxResults: vector.input.max_results,
      });
      assertMatchesVector(result, vector[primaryOutputKey] as any[]);
    });

    // Any secondary input_/output_ pair present in the vector (e.g. a different sort mode).
    const secondaryInputKey = Object.keys(vector).find((k) => k.startsWith("input_"));
    if (secondaryInputKey) {
      const suffix = secondaryInputKey.replace("input_", "");
      it(`${vector.name}: secondary sort (${suffix}) matches`, () => {
        const sections = buildSections(vector.fixtures);
        const secondaryInput = vector[secondaryInputKey] as Vector["input"];
        const result = generateCombinations({
          sections,
          selectedSectionIds: secondaryInput.selected_section_ids,
          optionalSectionIds: secondaryInput.optional_section_ids,
          maxOptionalCourses: secondaryInput.max_optional_courses,
          sortBy: secondaryInput.sort_by,
          maxResults: secondaryInput.max_results,
        });
        assertMatchesVector(result, vector[`output_sort_${suffix}`] as any[]);
      });
    }
  }
});
