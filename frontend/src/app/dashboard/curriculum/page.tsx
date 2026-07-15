"use client";

import { useEffect, useState } from "react";
import { Loader2, ChevronDown, Info, X } from "lucide-react";
import { useCurriculumStore, CurriculumGraph, ProgressSummaryCard, listCurricula } from "@/features/curriculum";
import type { CurriculumListItem } from "@/features/curriculum";

const CurriculumSkeleton = () => (
  <div className="flex-1 w-full h-full p-8 flex flex-col gap-8 relative overflow-hidden bg-zinc-950">
    {/* Floating Controls Skeletons */}
    <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
      <div className="w-48 h-12 bg-zinc-900/50 rounded-lg animate-pulse border border-zinc-800/50" />
      <div className="w-40 h-9 bg-zinc-900/50 rounded-xl animate-pulse border border-zinc-800/50" />
    </div>
    
    <div className="absolute top-4 right-4 z-10 w-[450px] h-9 bg-zinc-900/50 rounded-lg animate-pulse border border-zinc-800/50" />
    
    <div className="absolute bottom-4 right-4 z-10 w-56 h-32 bg-zinc-900/50 rounded-lg animate-pulse border border-zinc-800/50" />

    {/* Graph Nodes Skeletons */}
    <div className="w-full h-full flex items-center justify-center pt-20 pointer-events-none">
      <div className="grid grid-cols-5 gap-12 opacity-40">
        {[1,2,3,4,5].map(col => (
          <div key={`col-${col}`} className="flex flex-col gap-6">
            <div className="w-16 h-3 bg-zinc-800 rounded mx-auto mb-2 animate-pulse" />
            {[1,2,3,4,5].map(row => (
              <div key={`node-${col}-${row}`} className="w-44 h-20 bg-zinc-900/80 rounded-xl border border-zinc-800 animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default function CurriculumPage() {
  const [curricula, setCurricula] = useState<CurriculumListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [showWarning, setShowWarning] = useState(false);

  const { curriculum, summary, isLoading, error, fetchCurriculum, flushPendingSync, plannedPeriods, getCurrentPeriod } = useCurriculumStore();

  // Show one-time info message
  useEffect(() => {
    if (!localStorage.getItem("curriculumWarningDismissed")) {
      setShowWarning(true);
    }
  }, []);

  const dismissWarning = () => {
    localStorage.setItem("curriculumWarningDismissed", "true");
    setShowWarning(false);
  };

  // Flush pending changes when leaving the page
  useEffect(() => {
    return () => { flushPendingSync(); };
  }, [flushPendingSync]);

  useEffect(() => {
    async function load() {
      try {
        const list = await listCurricula();
        setCurricula(list);
        if (list.length > 0) {
          setSelectedId(list[0].id);
        }
      } catch {
        // ignore
      } finally {
        setLoadingList(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchCurriculum(selectedId);
    }
  }, [selectedId, fetchCurriculum]);

  if (loadingList) {
    return <CurriculumSkeleton />;
  }

  if (curricula.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 bg-zinc-950">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 3L2 9l10 6 10-6-10-6z" />
            <path d="M2 17l10 6 10-6" />
            <path d="M2 13l10 6 10-6" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-zinc-300">
          No hay mallas disponibles
        </h2>
        <p className="text-sm text-zinc-600 mt-1 max-w-sm">
          Aun no se han cargado mallas curriculares logradas para tu universidad.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950 relative">
      {error && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-red-950/80 backdrop-blur-sm border border-red-800 rounded-lg px-4 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {showWarning && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-blue-950/90 backdrop-blur-md border border-blue-800 rounded-lg px-4 py-3 shadow-2xl max-w-xl w-[calc(100%-2rem)] flex items-start gap-3 animate-in slide-in-from-top-4 fade-in duration-500">
          <div className="p-1.5 bg-blue-900/50 rounded-md shrink-0">
            <Info className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-200">Información sobre mallas curriculares</h4>
            <p className="text-xs text-blue-300/80 mt-1 leading-relaxed">
              Selecciona tu malla curricular usando el selector de arriba. Actualmente soportamos <strong>Ciencia de la Computación 2021</strong> y <strong>Ciencia de Datos 2021</strong>.
              Si necesitas que incorporemos la malla de otra carrera, no dudes en escribirnos a través del botón de ayuda.
            </p>
          </div>
          <button onClick={dismissWarning} className="text-blue-400 hover:text-blue-300 p-1 shrink-0 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Full-screen graph */}
      <div className="flex-1 min-h-0 relative">
        {isLoading ? (
          <CurriculumSkeleton />
        ) : curriculum ? (
          <>
            <CurriculumGraph curriculum={curriculum} />

            {/* Floating top-left: title + selector */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
              <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-lg px-4 py-2.5 shadow-lg">
                <p className="text-sm font-bold text-zinc-100">{curriculum.name}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {curriculum.total_semesters} semestres · {curriculum.total_credits} cr · {curriculum.courses.length} cursos
                </p>
              </div>

              {curricula.length > 1 && (
                <div className="relative">
                  <select
                    value={selectedId || ""}
                    onChange={(e) => setSelectedId(Number(e.target.value))}
                    className="appearance-none bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-xl px-3 py-2 pr-8 text-xs font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xl cursor-pointer"
                  >
                    {curricula.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
              )}
              {curricula.length === 1 && (
                <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-xl px-3 py-2 shadow-lg">
                  <p className="text-[10px] text-zinc-500">Malla única disponible</p>
                </div>
              )}
            </div>

            {/* Floating top-right: legend */}
            <div className="absolute top-4 right-4 z-10 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-lg px-3 py-2 shadow-lg">
              <div className="flex items-center gap-3 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-emerald-800 border border-emerald-600" />
                  <span className="text-zinc-400">Completado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-blue-950 border border-blue-700" />
                  <span className="text-zinc-400">En progreso</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-amber-950 border border-amber-700" />
                  <span className="text-zinc-400">Planificado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-zinc-900 border border-zinc-600" />
                  <span className="text-zinc-400">Disponible</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-zinc-900/40 border border-zinc-800 opacity-50" />
                  <span className="text-zinc-500">Bloqueado</span>
                </div>
              </div>
            </div>

            {/* Floating bottom-right: progress + planned */}
            <div className="absolute bottom-4 right-4 z-10 w-56 space-y-2">
              {plannedPeriods.size > 0 && curriculum && (() => {
                const period = getCurrentPeriod();
                const plannedCount = curriculum.courses.filter(c => plannedPeriods.get(c.id) === period).length;
                const totalPlanned = plannedPeriods.size;
                return (
                  <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-lg px-3 py-2 shadow-lg">
                    <p className="text-[10px] font-semibold text-amber-400/80">{totalPlanned} curso{totalPlanned !== 1 ? 's' : ''} planificado{totalPlanned !== 1 ? 's' : ''}</p>
                    {plannedCount > 0 && (
                      <p className="text-[10px] text-zinc-500">{plannedCount} para {period}</p>
                    )}
                  </div>
                );
              })()}
              {summary && <ProgressSummaryCard summary={summary} />}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
