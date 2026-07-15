/**
 * Schedule Generator (pure TypeScript port of backend/app/services/schedule_generator.py)
 *
 * IMPORTANT decoupling change vs. the Python version: the original service loads
 * sections from the DB (`_load_course_options`). This module does NO I/O — callers
 * must pass already-loaded `SectionOption[]` in the input. No React, no supabase.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type SortBy = "score" | "earliest" | "compact" | "spread" | "gaps";

export interface SessionOption {
  /** Session id (mirrors backend Session.id). */
  id: number;
  session_type?: string | null;
  /** Day as a string ("lunes", "monday", ...) or numeric 0-6 / 1-7. */
  day: string | number | null;
  /** "HH:MM" 24h format. */
  start_time: string;
  end_time: string;
  location?: string | null;
  modality?: string | null;
}

export interface SectionOption {
  section_id: number;
  course_id: number;
  course_code: string;
  course_name: string;
  section_number: string;
  professor?: string | null;
  /** Present on the section for reference; not used by the scoring algorithm. */
  capacity?: number | null;
  enrolled?: number | null;
  sessions: SessionOption[];
}

export interface GenerateCombinationsInput {
  sections: SectionOption[];
  /** Section ids from REQUIRED courses (must all appear in every combination). */
  selectedSectionIds: number[];
  /** Section ids from OPTIONAL courses (pick N of M). */
  optionalSectionIds?: number[];
  /** How many optional courses to include (undefined/null = all). */
  maxOptionalCourses?: number | null;
  sortBy?: SortBy;
  maxResults?: number;
}

export interface CombinationScores {
  earliest: number;
  gaps: number;
  spread: number;
  compactness: number;
  composite: number;
}

export interface CombinationSessionDict {
  session_id: number;
  session_type: string | null | undefined;
  day: string | number | null;
  start_time: string;
  end_time: string;
  location: string | null | undefined;
  modality: string | null | undefined;
}

export interface CombinationCourseDict {
  course_id: number;
  course_code: string;
  course_name: string;
  section_id: number;
  section_number: string;
  professor: string | null | undefined;
  sessions: CombinationSessionDict[];
}

export interface CombinationDict {
  combination_id: string;
  id_string: string;
  course_count: number;
  scores: CombinationScores;
  courses: CombinationCourseDict[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_ORDER: Record<string, number> = {
  // Spanish
  lunes: 0, martes: 1, "miércoles": 2, miercoles: 2,
  jueves: 3, viernes: 4, "sábado": 5, sabado: 5, domingo: 6,
  // English
  monday: 0, tuesday: 1, wednesday: 2,
  thursday: 3, friday: 4, saturday: 5, sunday: 6,
};

function parseDayToIdx(dayVal: string | number | null | undefined): number {
  if (dayVal === null || dayVal === undefined) return -1;

  if (typeof dayVal === "number") {
    if (dayVal >= 1 && dayVal <= 7) return dayVal - 1;
    if (dayVal >= 0 && dayVal <= 6) return dayVal;
    return -1;
  }

  const dayStr = String(dayVal).trim().toLowerCase();
  if (!dayStr) return -1;

  if (/^\d+$/.test(dayStr)) {
    const val = parseInt(dayStr, 10);
    if (val >= 1 && val <= 7) return val - 1;
    if (val >= 0 && val <= 6) return val;
    return -1;
  }

  if (dayStr in DAY_ORDER) return DAY_ORDER[dayStr];

  const prefix = dayStr.slice(0, 3);
  for (const key of Object.keys(DAY_ORDER)) {
    if (key.startsWith(prefix)) return DAY_ORDER[key];
  }

  return -1;
}

const SCORE_WEIGHTS = {
  earliest: 0.3,
  gaps: 0.3,
  spread: 0.25,
  compactness: 0.15,
};

const MAX_MINUTES = 24 * 60; // normalizer

// ─── Time Slot Bitmap ────────────────────────────────────────────────────────

/**
 * Set-based time-slot tracker for O(1) collision detection.
 * Each day has slots in 5-minute granularity (288 slots/day), keyed as
 * `day * 288 + slot`.
 */
class TimeSlotBitmap {
  static readonly SLOT_SIZE = 5; // minutes
  static readonly SLOTS_PER_DAY = 288;

  private occupied: Set<number> = new Set();

  copy(): TimeSlotBitmap {
    const next = new TimeSlotBitmap();
    next.occupied = new Set(this.occupied);
    return next;
  }

  /** Try to add a session. Returns false (no mutation) on collision. */
  addSession(dayIdx: number, startMinutes: number, endMinutes: number): boolean {
    if (dayIdx < 0 || dayIdx > 6) return true; // unknown day -> no collision

    const slotsNeeded: number[] = [];
    for (let t = startMinutes; t < endMinutes; t += TimeSlotBitmap.SLOT_SIZE) {
      const slot = Math.floor(t / TimeSlotBitmap.SLOT_SIZE);
      const key = dayIdx * TimeSlotBitmap.SLOTS_PER_DAY + slot;
      if (this.occupied.has(key)) return false;
      slotsNeeded.push(key);
    }

    for (const key of slotsNeeded) this.occupied.add(key);
    return true;
  }

  canAddSession(dayIdx: number, startMinutes: number, endMinutes: number): boolean {
    if (dayIdx < 0 || dayIdx > 6) return true;

    for (let t = startMinutes; t < endMinutes; t += TimeSlotBitmap.SLOT_SIZE) {
      const slot = Math.floor(t / TimeSlotBitmap.SLOT_SIZE);
      const key = dayIdx * TimeSlotBitmap.SLOTS_PER_DAY + slot;
      if (this.occupied.has(key)) return false;
    }
    return true;
  }
}

// ─── Course Option ───────────────────────────────────────────────────────────

function parseHHMM(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(":").map((v) => parseInt(v, 10));
  return { hour: h || 0, minute: m || 0 };
}

/** Represents a course section with its sessions, pre-computed for speed. */
class CourseOption {
  readonly sectionId: number;
  readonly courseId: number;
  readonly courseCode: string;
  readonly courseName: string;
  readonly sectionNumber: string;
  readonly professor: string | null | undefined;
  readonly sessions: SessionOption[];
  private readonly timeSlots: Array<[number, number, number]>;

  constructor(section: SectionOption) {
    this.sectionId = section.section_id;
    this.courseId = section.course_id;
    this.courseCode = section.course_code;
    this.courseName = section.course_name;
    this.sectionNumber = section.section_number;
    this.professor = section.professor;
    this.sessions = section.sessions;

    this.timeSlots = section.sessions.map((s) => {
      const dayIdx = parseDayToIdx(s.day);
      const start = parseHHMM(s.start_time);
      const end = parseHHMM(s.end_time);
      return [
        dayIdx,
        start.hour * 60 + start.minute,
        end.hour * 60 + end.minute,
      ] as [number, number, number];
    });
  }

  get timeSlotsList(): Array<[number, number, number]> {
    return this.timeSlots;
  }

  fitsBitmap(bitmap: TimeSlotBitmap): boolean {
    for (const [dayIdx, start, end] of this.timeSlots) {
      if (!bitmap.canAddSession(dayIdx, start, end)) return false;
    }
    return true;
  }

  /** Add this option's sessions to bitmap. Returns false on collision. */
  addToBitmap(bitmap: TimeSlotBitmap): boolean {
    for (const [dayIdx, start, end] of this.timeSlots) {
      if (!bitmap.addSession(dayIdx, start, end)) return false;
    }
    return true;
  }
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

/**
 * Round to 3 decimals using round-half-to-even (Python's `round(x, 3)`
 * semantics), operating on the double's exact decimal expansion via
 * `toFixed(20)` so we don't fabricate false ties from binary floating-point
 * noise the way naive `Math.round(x * 1000) / 1000` does.
 */
function round3(x: number): number {
  if (!Number.isFinite(x)) return x;
  const sign = x < 0 ? -1 : 1;
  const abs = Math.abs(x);
  const str = abs.toFixed(20);
  const [intPart, fracPart] = str.split(".");
  const kept = fracPart.slice(0, 3);
  const rest = fracPart.slice(3);
  let n = BigInt(intPart + kept);

  const first = rest[0];
  let roundUp: boolean;
  if (first < "5") {
    roundUp = false;
  } else if (first > "5") {
    roundUp = true;
  } else {
    const remainder = rest.slice(1).replace(/0+$/, "");
    roundUp = remainder.length > 0 ? true : n % BigInt(2) === BigInt(1);
  }
  if (roundUp) n += BigInt(1);

  return (Number(n) / 1000) * sign;
}

function scoreCombination(options: CourseOption[]): CombinationScores {
  if (options.length === 0) {
    return { earliest: 0, gaps: 0, spread: 0, compactness: 0, composite: 0 };
  }

  const daySessions = new Map<number, Array<[number, number]>>();
  const allStarts: number[] = [];

  for (const opt of options) {
    for (const [dayIdx, start, end] of opt.timeSlotsList) {
      if (dayIdx >= 0) {
        if (!daySessions.has(dayIdx)) daySessions.set(dayIdx, []);
        daySessions.get(dayIdx)!.push([start, end]);
        allStarts.push(start);
      }
    }
  }

  if (allStarts.length === 0) {
    return { earliest: 0, gaps: 0, spread: 0, compactness: 0, composite: 0 };
  }

  // 1. Earliest score: lower average start = better
  const avgStart = allStarts.reduce((a, b) => a + b, 0) / allStarts.length;
  const earliest = 1.0 - avgStart / MAX_MINUTES;

  // 2. Gap score: fewer minutes of gaps between consecutive classes = better
  let totalGapMinutes = 0;
  for (const intervals of daySessions.values()) {
    const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i][0] - sorted[i - 1][1];
      if (gap > 0) totalGapMinutes += gap;
    }
  }
  const gaps = Math.max(0.0, 1.0 - totalGapMinutes / 300.0);

  // 3. Spread score: how evenly distributed across days
  const activeDays = daySessions.size;
  const totalSessions = [...daySessions.values()].reduce((a, v) => a + v.length, 0);

  let spread: number;
  if (activeDays > 0 && totalSessions > 0) {
    const sessionsPerDay: number[] = [];
    for (let d = 0; d < 7; d++) sessionsPerDay.push(daySessions.get(d)?.length ?? 0);
    const activeCounts = sessionsPerDay.filter((c) => c > 0);
    if (activeCounts.length > 1) {
      const avgPerDay = totalSessions / activeDays;
      const variance =
        activeCounts.reduce((sum, c) => sum + (c - avgPerDay) ** 2, 0) / activeCounts.length;
      spread = Math.max(0.0, 1.0 - variance / 4.0);
    } else {
      spread = 0.0; // all on one day = bad spread
    }
  } else {
    spread = 0.0;
  }

  // 4. Compactness: fewer active days = better (less commute)
  const compactness = Math.max(0.0, 1.0 - (activeDays - 1) / 5.0);

  const composite =
    SCORE_WEIGHTS.earliest * earliest +
    SCORE_WEIGHTS.gaps * gaps +
    SCORE_WEIGHTS.spread * spread +
    SCORE_WEIGHTS.compactness * compactness;

  return {
    earliest: round3(earliest),
    gaps: round3(gaps),
    spread: round3(spread),
    compactness: round3(compactness),
    composite: round3(composite),
  };
}

// ─── Generation ──────────────────────────────────────────────────────────────

function groupByCourse(options: CourseOption[]): Map<string, CourseOption[]> {
  const groups = new Map<string, CourseOption[]>();
  for (const opt of options) {
    if (!groups.has(opt.courseCode)) groups.set(opt.courseCode, []);
    groups.get(opt.courseCode)!.push(opt);
  }
  return groups;
}

function backtrack(
  groups: Map<string, CourseOption[]>,
  courseCodes: string[],
  depth: number,
  current: CourseOption[],
  bitmap: TimeSlotBitmap,
  results: CourseOption[][],
  maxResults: number,
): void {
  if (results.length >= maxResults) return;

  if (depth === courseCodes.length) {
    results.push([...current]);
    return;
  }

  const code = courseCodes[depth];
  for (const option of groups.get(code)!) {
    const newBitmap = bitmap.copy();
    if (option.addToBitmap(newBitmap)) {
      current.push(option);
      backtrack(groups, courseCodes, depth + 1, current, newBitmap, results, maxResults);
      current.pop();
      if (results.length >= maxResults) return;
    }
  }
}

/**
 * Generate all valid (no-collision) combinations using recursive backtracking
 * with bitmap pruning. Base combination cap: 500.
 */
function generateValidCombinations(options: CourseOption[]): CourseOption[][] {
  const groups = groupByCourse(options);
  const courseCodes = [...groups.keys()];
  if (courseCodes.length === 0) return [];

  const results: CourseOption[][] = [];
  backtrack(groups, courseCodes, 0, [], new TimeSlotBitmap(), results, 500);
  return results;
}

function combinationsOf<T>(items: T[], k: number): T[][] {
  const result: T[][] = [];
  const combo: T[] = [];
  function rec(start: number) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < items.length; i++) {
      combo.push(items[i]);
      rec(i + 1);
      combo.pop();
    }
  }
  rec(0);
  return result;
}

/** Cartesian product of arrays (mirrors itertools.product(*lists)). */
function cartesianProduct<T>(lists: T[][]): T[][] {
  return lists.reduce<T[][]>(
    (acc, list) => acc.flatMap((prefix) => list.map((item) => [...prefix, item])),
    [[]],
  );
}

function comboToDict(options: CourseOption[], scores: CombinationScores): CombinationDict {
  const sortedOpts = [...options].sort((a, b) => a.sectionId - b.sectionId);
  return {
    combination_id: crypto.randomUUID(),
    id_string: sortedOpts.map((o) => String(o.sectionId)).join("_"),
    course_count: sortedOpts.length,
    scores,
    courses: sortedOpts.map((opt) => ({
      course_id: opt.courseId,
      course_code: opt.courseCode,
      course_name: opt.courseName,
      section_id: opt.sectionId,
      section_number: opt.sectionNumber,
      professor: opt.professor,
      sessions: opt.sessions.map((session) => ({
        session_id: session.id,
        session_type: session.session_type,
        day: session.day,
        start_time: session.start_time,
        end_time: session.end_time,
        location: session.location,
        modality: session.modality,
      })),
    })),
  };
}

const SORT_KEY_MAP: Record<string, (c: CombinationDict) => number> = {
  score: (c) => c.scores.composite ?? 0,
  earliest: (c) => c.scores.earliest ?? 0,
  gaps: (c) => c.scores.gaps ?? 0,
  spread: (c) => c.scores.spread ?? 0,
  compact: (c) => c.scores.compactness ?? 0,
};

function sortAndLimit(combos: CombinationDict[], sortBy: SortBy, maxResults: number): CombinationDict[] {
  const keyFn = SORT_KEY_MAP[sortBy] ?? SORT_KEY_MAP.score;
  // Stable sort descending (Array#sort is stable per spec in modern JS engines).
  const sorted = [...combos].sort((a, b) => keyFn(b) - keyFn(a));
  return sorted.slice(0, maxResults);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate combinations from user-selected sections. Pure function, no I/O:
 * pass in the already-loaded `sections` catalog plus the ids to combine.
 */
export function generateCombinations(input: GenerateCombinationsInput): CombinationDict[] {
  const {
    sections,
    selectedSectionIds,
    optionalSectionIds = [],
    maxOptionalCourses = null,
    sortBy = "score",
    maxResults = 200,
  } = input;

  const sectionsById = new Map(sections.map((s) => [s.section_id, s]));

  const loadOptions = (ids: number[]): CourseOption[] => {
    const options: CourseOption[] = [];
    for (const id of ids) {
      const section = sectionsById.get(id);
      if (!section) continue;
      if (!section.sessions || section.sessions.length === 0) continue;
      options.push(new CourseOption(section));
    }
    return options;
  };

  const requiredOptions = loadOptions(selectedSectionIds);
  const optionalOptions = loadOptions(optionalSectionIds);

  if (requiredOptions.length === 0 && optionalOptions.length === 0) return [];

  const requiredCombos = generateValidCombinations(requiredOptions);

  if (optionalOptions.length === 0) {
    const scored = requiredCombos.map((opts) => comboToDict(opts, scoreCombination(opts)));
    return sortAndLimit(scored, sortBy, maxResults);
  }

  const optionalGroups = groupByCourse(optionalOptions);
  const optionalCourseCodes = [...optionalGroups.keys()];

  let pickCount = maxOptionalCourses ?? optionalCourseCodes.length;
  pickCount = Math.min(pickCount, optionalCourseCodes.length);

  const allResults: CombinationDict[] = [];

  for (const baseOpts of requiredCombos) {
    const baseBitmap = new TimeSlotBitmap();
    let bitmapOk = true;
    for (const opt of baseOpts) {
      if (!opt.addToBitmap(baseBitmap)) {
        bitmapOk = false;
        break;
      }
    }
    if (!bitmapOk) continue;

    for (const optCourseSubset of combinationsOf(optionalCourseCodes, pickCount)) {
      const optSectionLists = optCourseSubset.map((code) => optionalGroups.get(code)!);

      // NB: mirrors the Python's bare `break`, which only exits this
      // innermost loop (product of optional sections) — not the subset or
      // base-combo loops above it. Replicated verbatim for parity, even
      // though it means the 2x cap is a soft/local guard, not a global stop.
      for (const optSectionCombo of cartesianProduct(optSectionLists)) {
        const testBitmap = baseBitmap.copy();
        let valid = true;

        for (const optSection of optSectionCombo) {
          if (!optSection.addToBitmap(testBitmap)) {
            valid = false;
            break;
          }
        }

        if (valid) {
          const fullOpts = [...baseOpts, ...optSectionCombo];
          const scores = scoreCombination(fullOpts);
          allResults.push(comboToDict(fullOpts, scores));

          if (allResults.length >= maxResults * 2) {
            break;
          }
        }
      }
    }
  }

  return sortAndLimit(allResults, sortBy, maxResults);
}
