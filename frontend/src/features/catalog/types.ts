// Catalog feature types. Course/Section/Session/University are shared app-wide
// contracts (used by curriculum + collaboration too), so we re-export the
// canonical shapes from the global @/types module rather than forking them.
export type { Course, Section, Session, University } from "@/types";

export type {
  CargaHabilCourse,
  CargaHabilCourseType,
  CargaHabilParseResult,
} from "./logic/cargaHabil";
