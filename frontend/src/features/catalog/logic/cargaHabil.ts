/**
 * Carga Habil text parser (pure TypeScript port of the regex-based text
 * parsing logic in backend/app/services/pdf_parser.py).
 *
 * The Python service extracts text from a PDF via pdfplumber first, then runs
 * these regexes over each line. PDF byte extraction is out of scope here
 * (pdfjs-dist wiring comes later) — this module only covers the text -> course
 * list step, taking already-extracted raw text.
 */

export type CargaHabilCourseType = "Obligatorio" | "Electivo";

export interface CargaHabilCourse {
  code: string;
  name: string;
  type: CargaHabilCourseType;
}

export interface CargaHabilParseResult {
  mandatory: CargaHabilCourse[];
  electives: CargaHabilCourse[];
}

// Primary pattern: "CS4016 Computación Paralela 4.00 0.00 0.00 Obligatorio"
const PATTERN = /^([A-Z]{2,3}[0-9]{4})\s+(.+?)\s+(?:\d+\.\d{2}\s+)+.*?(Obligatorio|Electivo)$/i;

// Looser fallback used when the credits format doesn't match cleanly.
const LOOSE_PATTERN = /([A-Z]{2,3}[0-9]{4})\s+(.+?)\s+.*?(Obligatorio|Electivo)/i;

const TRAILING_NUMBERS = /\s+\d+(\.\d+)?.*$/;

/** Parse raw carga-habil text (already extracted from the PDF) into course lists. */
export function parseCargaHabilText(text: string): CargaHabilParseResult {
  const mandatoryCourses = new Map<string, CargaHabilCourse>();
  const electiveCourses = new Map<string, CargaHabilCourse>();

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    // Fast check if it even looks like a course row, to avoid regex overhead.
    if (!(line.includes("bligatorio") || line.includes("lectivo"))) continue;

    let courseCode: string | null = null;
    let courseName: string | null = null;
    let courseTypeStr: string | null = null;

    const match = PATTERN.exec(line);
    if (match) {
      courseCode = match[1].toUpperCase();
      courseName = match[2].trim();
      courseTypeStr = match[3].toLowerCase();
    } else {
      const looseMatch = LOOSE_PATTERN.exec(line);
      if (looseMatch) {
        courseCode = looseMatch[1].toUpperCase();
        courseName = looseMatch[2].trim();
        courseTypeStr = looseMatch[3].toLowerCase();
      }
    }

    if (courseCode && courseName && courseTypeStr) {
      // Clean up trailing numbers or weird stops in name if regex got greedy.
      courseName = courseName.replace(TRAILING_NUMBERS, "").trim();

      const type: CargaHabilCourseType = courseTypeStr.includes("obligatorio")
        ? "Obligatorio"
        : "Electivo";
      const courseData: CargaHabilCourse = { code: courseCode, name: courseName, type };

      if (courseTypeStr.includes("obligatorio")) {
        mandatoryCourses.set(courseCode, courseData);
      } else if (courseTypeStr.includes("electivo")) {
        electiveCourses.set(courseCode, courseData);
      }
    }
  }

  return {
    mandatory: [...mandatoryCourses.values()],
    electives: [...electiveCourses.values()],
  };
}
