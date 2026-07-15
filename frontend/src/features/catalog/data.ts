// Supabase access for the catalog feature. Only this file (and other data.ts
// files) may import the supabase client — components/hooks must go through
// index.ts.
import { createClient } from "@/lib/supabase/client";
import type { Course } from "@/types";
import { parseCargaHabilText } from "./logic/cargaHabil";
import type { CargaHabilParseResult } from "./logic/cargaHabil";

const COURSE_WITH_SECTIONS = "*, university:universities(*), sections(*, sessions(*))";

/**
 * Search courses (replaces GET /api/courses/search). Filters mirror the old
 * backend query params: free-text `query` against code/name, `university`
 * short_name, `department` code. `professor` filters on the nested sections
 * table, which needs an inner join to be effective.
 */
export async function searchCourses(
  query?: string,
  university?: string,
  department?: string,
  professor?: string,
  limit = 20,
): Promise<Course[]> {
  const supabase = createClient();
  const needsSectionInnerJoin = !!professor;

  let q = supabase
    .from("courses")
    .select(
      `*, university:universities!inner(*), sections${needsSectionInnerJoin ? "!inner" : ""}(*, sessions(*))`,
    )
    .eq("is_active", true)
    .limit(limit);

  if (university) q = q.eq("university.short_name", university);
  if (department) q = q.eq("department", department);
  if (query && query.trim().length > 0) {
    const term = query.trim().replace(/[%,]/g, "");
    q = q.or(`code.ilike.%${term}%,name.ilike.%${term}%`);
  }
  if (professor) q = q.ilike("sections.professor", `%${professor.replace(/[%,]/g, "")}%`);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Course[];
}

/** Fetch full course+section+session details for a set of course codes (replaces POST /api/courses/bulk-details). */
export async function getBulkCourseDetails(
  courseCodes: string[],
  universityId = 1,
): Promise<Course[]> {
  if (courseCodes.length === 0) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_WITH_SECTIONS)
    .eq("university_id", universityId)
    .in("code", courseCodes);
  if (error) throw error;
  return (data ?? []) as unknown as Course[];
}

/** Fetch full course details by id, with course-name fallback (replaces POST /api/courses/bulk-by-ids). */
export async function getBulkCoursesByIds(
  courseIds: number[],
  courseNames: string[] = [],
): Promise<Course[]> {
  const orParts: string[] = [];
  if (courseIds.length > 0) orParts.push(`id.in.(${courseIds.join(",")})`);
  if (courseNames.length > 0) {
    const escaped = courseNames.map((n) => `"${n.replace(/"/g, "")}"`).join(",");
    orParts.push(`name.in.(${escaped})`);
  }
  if (orParts.length === 0) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_WITH_SECTIONS)
    .or(orParts.join(","));
  if (error) throw error;
  return (data ?? []) as unknown as Course[];
}

/**
 * Extract raw text from a PDF in-browser via pdfjs-dist, reconstructing lines
 * by clustering text items on their rounded baseline Y coordinate (mirrors
 * pdfplumber's line grouping closely enough for the carga-habil regexes).
 * ponytail: rounded-Y clustering is a heuristic, not real layout analysis —
 * upgrade to a Y-tolerance window if carga-habil PDFs start rendering with
 * sub-pixel baseline jitter that splits/merges lines incorrectly.
 */
async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  const lines: string[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const rows = new Map<number, { x: number; str: string }[]>();

    for (const item of content.items as Array<{ str: string; transform: number[] }>) {
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x, str: item.str });
    }

    const sortedY = [...rows.keys()].sort((a, b) => b - a); // top to bottom
    for (const y of sortedY) {
      const row = rows.get(y)!.sort((a, b) => a.x - b.x);
      lines.push(row.map((r) => r.str).join(" "));
    }
  }

  return lines.join("\n");
}

/** Parse a carga-habil PDF into mandatory/elective course lists (replaces POST /api/courses/parse-carga-habil). */
export async function parseCargaHabilFile(file: File): Promise<CargaHabilParseResult> {
  const text = await extractPdfText(file);
  return parseCargaHabilText(text);
}

/** Text-paste path: same parser, skips PDF extraction entirely. */
export function parseCargaHabilPastedText(text: string): CargaHabilParseResult {
  return parseCargaHabilText(text);
}
