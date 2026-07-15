"use client";

import type { ProgressSummary } from "../types";
import { CheckCircle2, Unlock, BookOpen } from "lucide-react";

interface ProgressSummaryCardProps {
  summary: ProgressSummary;
}

export default function ProgressSummaryCard({ summary }: ProgressSummaryCardProps) {
  const percentage = Math.round(summary.percentage);

  return (
    <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-lg p-3 shadow-lg space-y-3">
      {/* Circular progress */}
      <div className="flex items-center gap-3">
        <div className="relative w-11 h-11 flex-shrink-0">
          <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#3f3f46"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeDasharray={`${percentage}, 100`}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-zinc-100">
            {percentage}%
          </span>
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-100">Progreso</p>
          <p className="text-[10px] text-zinc-500">
            {summary.credits_earned}/{summary.credits_total} creditos
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-1 text-center">
        <div className="bg-zinc-800/50 rounded-lg py-1.5 px-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-500/70 mx-auto mb-0.5" />
          <p className="text-xs font-bold text-zinc-100">{summary.completed}</p>
          <p className="text-[8px] text-zinc-500">Aprobados</p>
        </div>
        <div className="bg-zinc-800/50 rounded-lg py-1.5 px-1">
          <Unlock className="w-3 h-3 text-zinc-400 mx-auto mb-0.5" />
          <p className="text-xs font-bold text-zinc-100">{summary.unlocked_count}</p>
          <p className="text-[8px] text-zinc-500">Disponibles</p>
        </div>
        <div className="bg-zinc-800/50 rounded-lg py-1.5 px-1">
          <BookOpen className="w-3 h-3 text-blue-500/60 mx-auto mb-0.5" />
          <p className="text-xs font-bold text-zinc-100">{summary.in_progress}</p>
          <p className="text-[8px] text-zinc-500">En curso</p>
        </div>
      </div>
    </div>
  );
}
