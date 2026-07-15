import { describe, expect, it } from "vitest";
import { computeUnlocked, computeCourseStatus } from "../prerequisites";
import type { CurriculumCourse } from "../../types";

function course(overrides: Partial<CurriculumCourse> & { id: number }): CurriculumCourse {
  return {
    course_name: `Course ${overrides.id}`,
    semester: 1,
    credits: 4,
    is_elective: false,
    elective_group: null,
    linked_course_id: null,
    prerequisites: [],
    ...overrides,
  };
}

describe("computeUnlocked", () => {
  it("locks a course until its course-type prerequisite is completed", () => {
    const courses = [
      course({ id: 1 }),
      course({ id: 2, prerequisites: [{ id: 1, prerequisite_course_id: 1, prerequisite_type: "course", required_credits: null, prerequisite_course_name: "Course 1" }] }),
    ];

    const locked = computeUnlocked(courses, () => "pending");
    expect(locked.unlockedIds.has(2)).toBe(false);
    expect(locked.unlockedIds.has(1)).toBe(true);

    const unlocked = computeUnlocked(courses, (id) => (id === 1 ? "completed" : "pending"));
    expect(unlocked.unlockedIds.has(2)).toBe(true);
  });

  it("unlocks a credits-type prerequisite only once enough credits are earned", () => {
    const courses = [
      course({ id: 1, credits: 20 }),
      course({ id: 2, prerequisites: [{ id: 1, prerequisite_course_id: null, prerequisite_type: "credits", required_credits: 20, prerequisite_course_name: null }] }),
    ];

    const before = computeUnlocked(courses, () => "pending");
    expect(before.unlockedIds.has(2)).toBe(false);

    const after = computeUnlocked(courses, (id) => (id === 1 ? "completed" : "pending"));
    expect(after.totalCredits).toBe(20);
    expect(after.unlockedIds.has(2)).toBe(true);
  });

  it("electives are always unlocked regardless of prerequisites, until completed", () => {
    const courses = [course({ id: 1, is_elective: true })];
    const pending = computeUnlocked(courses, () => "pending");
    expect(pending.unlockedIds.has(1)).toBe(true);

    const completed = computeUnlocked(courses, () => "completed");
    expect(completed.unlockedIds.has(1)).toBe(false);
  });
});

describe("computeCourseStatus", () => {
  it("prioritizes a local override over the last-synced server status", () => {
    const status = computeCourseStatus({
      courseId: 1,
      serverStatus: "pending",
      localOverride: "completed",
      isElective: false,
      isUnlocked: true,
      hasPlannedPeriod: false,
    });
    expect(status).toBe("completed");
  });

  it("reports 'planned' for an unlocked course with a planned period", () => {
    const status = computeCourseStatus({
      courseId: 1,
      serverStatus: "pending",
      localOverride: undefined,
      isElective: false,
      isUnlocked: true,
      hasPlannedPeriod: true,
    });
    expect(status).toBe("planned");
  });
});
