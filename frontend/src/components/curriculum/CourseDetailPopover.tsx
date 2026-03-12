"use client";

import { Check, BookOpen, Clock, Link2, Unlink } from "lucide-react";
import type { CourseStatus } from "@/types/curriculum";

interface CourseDetailPopoverProps {
  courseId: number;
  name: string;
  credits: number;
  semester: number;
  isElective: boolean;
  status: CourseStatus;
  linkedCourseId: number | null;
  plannedPeriod: string | null;
  prerequisiteNames: string[];
  creditPrerequisites: { required: number }[];
  unlocksNames: string[];
  onSetStatus: (status: string) => void;
  onSetPlan: (period: string | null) => void;
  onSetElectiveLink?: (courseId: number, courseName: string) => void;
  linkedCourseName?: string;
}

function generatePeriodOptions(): { value: string; label: string }[] {
  const now = new Date();
  const year = now.getFullYear();
  const options: { value: string; label: string }[] = [];
  for (let y = year; y <= year + 2; y++) {
    options.push({ value: `${y}-1`, label: `${y}-1` });
    options.push({ value: `${y}-2`, label: `${y}-2` });
  }
  return options;
}

const PERIOD_OPTIONS = generatePeriodOptions();

import { useState, useRef, useEffect } from "react";
import { apiService } from "@/services/api";
import type { Course } from "@/types";

export default function CourseDetailPopover({
  name,
  credits,
  semester,
  isElective,
  status,
  linkedCourseId,
  plannedPeriod,
  prerequisiteNames,
  creditPrerequisites,
  unlocksNames,
  onSetStatus,
  onSetPlan,
  onSetElectiveLink,
  linkedCourseName,
}: CourseDetailPopoverProps) {
  const isLocked = status === "locked";
  const baseStatus = status === "planned" ? "unlocked" : status;

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Course[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await apiService.searchCourses(query.trim(), "UTEC", undefined, undefined, 5);
      setSearchResults(results);
      setIsSearchOpen(true);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCourse = (course: Course) => {
    if (onSetElectiveLink) {
      onSetElectiveLink(course.id, course.name);
    }
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="space-y-3 min-w-[260px]">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-zinc-100 leading-tight">{name}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
            {credits} creditos
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
            Ciclo {semester}
          </span>
          {isElective && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
              Electivo
            </span>
          )}
        </div>
      </div>

      {/* Prerequisites */}
      <div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Prerequisitos</p>
        {prerequisiteNames.length === 0 && creditPrerequisites.length === 0 ? (
          <p className="text-xs text-zinc-600">Sin prerequisitos</p>
        ) : (
          <div className="space-y-0.5">
            {prerequisiteNames.map((pn, i) => (
              <p key={i} className="text-xs text-zinc-400">· {pn}</p>
            ))}
            {creditPrerequisites.map((cp, i) => (
              <p key={`cr-${i}`} className="text-xs text-zinc-400">· {cp.required} creditos aprobados</p>
            ))}
          </div>
        )}
      </div>

      {/* Unlocks */}
      {unlocksNames.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Desbloquea</p>
          <div className="space-y-0.5">
            {unlocksNames.map((un, i) => (
              <p key={i} className="text-xs text-zinc-400">· {un}</p>
            ))}
          </div>
        </div>
      )}

      {/* Status buttons */}
      {!isLocked && (
        <div>
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Estado</p>
          <div className="flex gap-1.5">
            <button
              onClick={() => onSetStatus("completed")}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                baseStatus === "completed"
                  ? "bg-emerald-900/80 text-emerald-300 border border-emerald-700"
                  : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:text-zinc-300"
              }`}
            >
              <Check className="w-3 h-3" />
              Completado
            </button>
            <button
              onClick={() => onSetStatus("in_progress")}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                baseStatus === "in_progress"
                  ? "bg-blue-900/80 text-blue-300 border border-blue-700"
                  : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:text-zinc-300"
              }`}
            >
              <BookOpen className="w-3 h-3" />
              En Curso
            </button>
            <button
              onClick={() => onSetStatus("pending")}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                baseStatus === "unlocked" || baseStatus === "pending"
                  ? "bg-zinc-700/80 text-zinc-300 border border-zinc-600"
                  : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:text-zinc-300"
              }`}
            >
              <Clock className="w-3 h-3" />
              Pendiente
            </button>
          </div>
        </div>
      )}

      {/* Plan for period */}
      {!isLocked && baseStatus !== "completed" && (
        <div>
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Planificar</p>
          <select
            value={plannedPeriod || ""}
            onChange={(e) => onSetPlan(e.target.value || null)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
          >
            <option value="">Sin planificar</option>
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Linked course indicator / Elective search */}
      <div className="pt-2 border-t border-zinc-800">
        {isElective ? (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Elegir Electivo</p>
            {linkedCourseId && linkedCourseName ? (
              <div className="flex items-center justify-between bg-emerald-950/30 border border-emerald-900/50 rounded px-2 py-1.5">
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <Link2 className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{linkedCourseName}</span>
                </div>
                <button 
                  onClick={() => setIsSearchOpen(true)}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mb-1.5">
                <Unlink className="w-3 h-3" />
                Ningun curso seleccionado
              </div>
            )}
            
            {(isSearchOpen || (!linkedCourseId && !isLocked)) && (
              <div className="relative" ref={searchRef}>
                <input
                  type="text"
                  placeholder="Buscar curso para este electivo..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setIsSearchOpen(true);
                  }}
                  className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50 focus:bg-zinc-800 transition-colors placeholder:text-zinc-600"
                />
                
                {isSearchOpen && (searchQuery.length >= 3 || isSearching) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded shadow-lg overflow-hidden z-20 max-h-40 overflow-y-auto">
                    {isSearching ? (
                      <div className="px-3 py-2 text-xs text-zinc-500 text-center">Buscando...</div>
                    ) : searchResults.length > 0 ? (
                      <div className="py-1">
                        {searchResults.map((course) => (
                          <button
                            key={course.id}
                            className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors flex flex-col"
                            onClick={() => handleSelectCourse(course)}
                          >
                            <span className="font-medium truncate text-[11px]">{course.name}</span>
                            <span className="text-[9px] text-zinc-500">{course.code}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-3 py-2 text-xs text-zinc-500 text-center">No se encontraron cursos</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          linkedCourseId ? (
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-500/70">
              <Link2 className="w-3 h-3" />
              {linkedCourseName || "Vinculado al catalogo"}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <Unlink className="w-3 h-3" />
              No vinculado
            </div>
          )
        )}
      </div>
    </div>
  );
}
