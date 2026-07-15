import { describe, expect, it } from "vitest";
import { findBlockingConflicts } from "../conflictExplainer";
import type { SectionOption } from "../scheduleGenerator";

const section = (id: number, code: string, name: string, num: string, sessions: [string, string, string][]): SectionOption => ({
  section_id: id,
  course_id: id,
  course_code: code,
  course_name: name,
  section_number: num,
  professor: "X",
  sessions: sessions.map(([day, start, end], i) => ({
    id: id * 10 + i,
    session_type: "TEORÍA 1",
    day,
    start_time: start,
    end_time: end,
    location: "",
    modality: "Presencial",
  })),
});

describe("findBlockingConflicts", () => {
  // Mirrors the real case: Big Data Mon 20-22 vs IoT Mon 19-21, single sections.
  it("reports a pair whose only sections always overlap", () => {
    const sections = [
      section(1, "DS4341", "Big Data", "1", [["Monday", "20:00", "22:00"]]),
      section(2, "CS5055", "Internet de las Cosas", "1", [["Monday", "19:00", "21:00"]]),
    ];
    const out = findBlockingConflicts(sections, [1, 2]);
    expect(out).toHaveLength(1);
    expect(out[0].courseA).toBe("Big Data");
    expect(out[0].courseB).toBe("Internet de las Cosas");
    expect(out[0].example.day).toBe("Monday");
  });

  it("does not report a pair when one section combination is conflict-free", () => {
    const sections = [
      section(1, "A", "Curso A", "1", [["Monday", "10:00", "12:00"]]),
      section(2, "B", "Curso B", "1", [["Monday", "11:00", "13:00"]]),
      section(3, "B", "Curso B", "2", [["Tuesday", "11:00", "13:00"]]),
    ];
    expect(findBlockingConflicts(sections, [1, 2, 3])).toHaveLength(0);
  });

  it("back-to-back times do not overlap", () => {
    const sections = [
      section(1, "A", "Curso A", "1", [["Monday", "10:00", "12:00"]]),
      section(2, "B", "Curso B", "1", [["Monday", "12:00", "14:00"]]),
    ];
    expect(findBlockingConflicts(sections, [1, 2])).toHaveLength(0);
  });
});
