"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Check, Lock, Circle, CalendarClock, Link } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import CourseDetailPopover from "./CourseDetailPopover";
import type { CourseStatus } from "../types";

export interface CourseNodeData {
  label: string;
  credits: number;
  semester: number;
  courseId: number;
  status: CourseStatus;
  isElective: boolean;
  linkedCourseId: number | null;
  plannedPeriod: string | null;
  prerequisiteNames: string[];
  creditPrerequisites: { required: number }[];
  unlocksNames: string[];
  dimmed: boolean;
  onSetStatus: (courseId: number, status: string) => void;
  onSetPlan: (courseId: number, period: string | null) => void;
  onSelectNode: (courseId: number | null) => void;
  onSetElectiveLink?: (courseId: number, linkedCourseId: number, linkedCourseName: string) => void;
  linkedCourseName?: string;
}

function CurriculumCourseNode({ data }: NodeProps) {
  const d = data as unknown as CourseNodeData;
  const [open, setOpen] = useState(false);

  const completed = d.status === "completed";
  const inProgress = d.status === "in_progress";
  const planned = d.status === "planned";
  const unlocked = d.status === "unlocked" || d.status === "pending";
  const locked = d.status === "locked";
  const isClickable = !locked;

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    d.onSelectNode(isOpen ? d.courseId : null);
  };

  const displayName = (d.isElective && d.linkedCourseName) ? d.linkedCourseName : d.label;
  const isLinkedElective = !!(d.isElective && d.linkedCourseName);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-1.5 !h-1.5 !border-none !bg-zinc-700 !-top-[3px]"
      />

      <PopoverTrigger asChild>
        <div
          className={`
            relative group w-[155px] rounded-lg border transition-all duration-200 ease-out
            ${completed
              ? "bg-emerald-950/80 border-emerald-800/60 hover:border-emerald-700/80"
              : inProgress
              ? "bg-blue-950/60 border-blue-800/50 hover:border-blue-700/70"
              : planned
              ? "bg-amber-950/50 border-amber-800/50 hover:border-amber-700/70"
              : unlocked
              ? "bg-zinc-900 border-zinc-700 hover:border-zinc-500"
              : "bg-zinc-900/40 border-zinc-800/50 opacity-50"
            }
            ${isClickable ? "cursor-pointer hover:scale-[1.03]" : "cursor-not-allowed"}
            ${d.isElective ? "border-dashed" : ""}
            ${d.dimmed ? "!opacity-15" : ""}
          `}
        >
          <div className="px-3 py-2.5">
            {/* Status icon + name */}
            <div className="flex items-start gap-2">
              <div className={`mt-0.5 flex-shrink-0 ${
                completed ? "text-emerald-400" :
                inProgress ? "text-blue-400" :
                planned ? "text-amber-400" :
                unlocked ? "text-zinc-500" :
                "text-zinc-700"
              }`}>
                {completed ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> :
                 locked ? <Lock className="w-3 h-3" /> :
                 planned ? <CalendarClock className="w-3.5 h-3.5" /> :
                 <Circle className="w-3 h-3" />}
              </div>
              <p
                className={`text-[11px] font-medium leading-tight line-clamp-2 ${
                  completed ? "text-emerald-200" :
                  inProgress ? "text-blue-200" :
                  planned ? "text-amber-200" :
                  unlocked ? "text-zinc-300" :
                  "text-zinc-600"
                }`}
                title={displayName}
              >
                {displayName}
                {isLinkedElective && (
                  <Link className="inline-block w-2.5 h-2.5 ml-1 text-zinc-400 opacity-80" />
                )}
              </p>
            </div>

            {/* Bottom row */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                completed ? "bg-emerald-900/60 text-emerald-300" :
                inProgress ? "bg-blue-900/60 text-blue-300" :
                planned ? "bg-amber-900/60 text-amber-300" :
                unlocked ? "bg-zinc-800 text-zinc-400" :
                "bg-zinc-800/50 text-zinc-600"
              }`}>
                {d.credits} cr
              </span>
              {planned && d.plannedPeriod ? (
                <span className="text-[9px] font-medium text-amber-400/80">
                  {d.plannedPeriod}
                </span>
              ) : (
                <span className={`text-[9px] ${
                  completed ? "text-emerald-400/60" :
                  inProgress ? "text-blue-400/60" :
                  unlocked ? "text-zinc-500" :
                  "text-zinc-700"
                }`}>
                  Ciclo {d.semester}
                </span>
              )}
              {d.isElective && (
                <span className={`text-[9px] ${
                  completed ? "text-emerald-400/50" :
                  planned ? "text-amber-400/50" :
                  unlocked ? "text-zinc-500" :
                  "text-zinc-700"
                }`}>
                  Elect.
                </span>
              )}
            </div>
          </div>

          {/* Hover hint */}
          {isClickable && !open && (
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-zinc-500 whitespace-nowrap pointer-events-none">
              Click para ver detalles
            </div>
          )}

          {/* Completed indicator */}
          {completed && (
            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            </div>
          )}

          {/* Planned indicator */}
          {planned && (
            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-600 rounded-full flex items-center justify-center">
              <CalendarClock className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
            </div>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent
        side="right"
        sideOffset={12}
        className="w-[280px] bg-zinc-900 border-zinc-800 p-3"
      >
        <CourseDetailPopover
          courseId={d.courseId}
          name={d.label}
          credits={d.credits}
          semester={d.semester}
          isElective={d.isElective}
          status={d.status}
          linkedCourseId={d.linkedCourseId}
          plannedPeriod={d.plannedPeriod}
          prerequisiteNames={d.prerequisiteNames}
          creditPrerequisites={d.creditPrerequisites}
          unlocksNames={d.unlocksNames}
          onSetStatus={(status) => d.onSetStatus(d.courseId, status)}
          onSetPlan={(period) => d.onSetPlan(d.courseId, period)}
          onSetElectiveLink={
            d.onSetElectiveLink
              ? (linkedId, linkedName) => d.onSetElectiveLink!(d.courseId, linkedId, linkedName)
              : undefined
          }
          linkedCourseName={d.linkedCourseName}
        />
      </PopoverContent>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-1.5 !h-1.5 !border-none !bg-zinc-700 !-bottom-[3px]"
      />
    </Popover>
  );
}

export default memo(CurriculumCourseNode);
