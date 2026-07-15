// When generation yields zero combinations, explain why: find course pairs
// where EVERY section of one overlaps EVERY section of the other — those pairs
// make a schedule mathematically impossible no matter what the user picks.
import type { SectionOption } from "./scheduleGenerator";

export interface BlockingConflict {
  courseA: string;
  courseB: string;
  /** Example overlap shown to the user (first one found). */
  example: {
    sectionA: string;
    sectionB: string;
    day: string;
    startA: string;
    endA: string;
    startB: string;
    endB: string;
  };
}

const toMin = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

function sectionsOverlap(a: SectionOption, b: SectionOption): { day: string; sa: string; ea: string; sb: string; eb: string } | null {
  for (const x of a.sessions) {
    for (const y of b.sessions) {
      if (x.day == null || y.day == null || String(x.day) !== String(y.day)) continue;
      if (toMin(x.start_time) < toMin(y.end_time) && toMin(y.start_time) < toMin(x.end_time)) {
        return { day: String(x.day), sa: x.start_time, ea: x.end_time, sb: y.start_time, eb: y.end_time };
      }
    }
  }
  return null;
}

/**
 * Course pairs (among the given required sections) that block all schedules:
 * every section of course A conflicts with every section of course B.
 */
export function findBlockingConflicts(sections: SectionOption[], requiredSectionIds: number[]): BlockingConflict[] {
  const required = new Set(requiredSectionIds);
  const byCourse = new Map<string, SectionOption[]>();
  for (const s of sections) {
    if (!required.has(s.section_id)) continue;
    const list = byCourse.get(s.course_code) ?? [];
    list.push(s);
    byCourse.set(s.course_code, list);
  }

  const courses = [...byCourse.entries()];
  const blocking: BlockingConflict[] = [];

  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      const [codeA, secsA] = courses[i];
      const [codeB, secsB] = courses[j];
      let example: BlockingConflict["example"] | null = null;
      let allConflict = true;

      for (const a of secsA) {
        for (const b of secsB) {
          const overlap = sectionsOverlap(a, b);
          if (!overlap) {
            allConflict = false;
            break;
          }
          example ??= {
            sectionA: a.section_number,
            sectionB: b.section_number,
            day: overlap.day,
            startA: overlap.sa.slice(0, 5),
            endA: overlap.ea.slice(0, 5),
            startB: overlap.sb.slice(0, 5),
            endB: overlap.eb.slice(0, 5),
          };
        }
        if (!allConflict) break;
      }

      if (allConflict && example) {
        blocking.push({ courseA: secsA[0].course_name, courseB: secsB[0].course_name, example });
      }
    }
  }
  return blocking;
}
