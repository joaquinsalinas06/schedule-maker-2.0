import type { SelectedSection } from "@/types";
import type { SortBy } from "./logic/scheduleGenerator";

export type { SectionOption, SessionOption, CombinationDict, SortBy } from "./logic/scheduleGenerator";
export type { SelectedSection, ScheduleResponse, ScheduleCombination, Filter } from "@/types";

export interface GenerateSchedulesParams {
  selectedSections: SelectedSection[];
  optionalCourses: Set<string>;
  maxOptionalCourses?: number;
  sortBy?: SortBy;
}
