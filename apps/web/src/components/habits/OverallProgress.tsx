// components/habits/OverallProgress.tsx
"use client";

import { Flame, Target } from "lucide-react";
import { ProgressRing } from "./ProgressRing";

interface OverallProgressProps {
  overallPct: number; // 0..1
  totalCompleted: number;
  totalExpected: number;
  currentStreak: number;
  onTrackCount: number;
  habitCount: number;
}

export function OverallProgress({
  overallPct,
  totalCompleted,
  totalExpected,
  currentStreak,
  onTrackCount,
  habitCount,
}: OverallProgressProps) {
  const pct = Math.round(overallPct * 100);

  return (
    <div className="flex items-center gap-5 rounded-xl border border-border-default bg-surface-1 px-5 py-3">
      <ProgressRing progress={overallPct} complete={pct >= 100} size={48} strokeWidth={5}>
        <span className="text-[13px] font-semibold text-text-primary">{pct}%</span>
      </ProgressRing>

      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-text-ghost">Weekly Progress</span>
        <span className="text-[13px] font-medium text-text-primary">
          {totalCompleted} / {totalExpected} habit-days
        </span>
      </div>

      <div className="h-8 w-px bg-border-subtle" />

      <div className="flex items-center gap-1.5">
        <Flame size={15} strokeWidth={2} className={currentStreak > 0 ? "text-accent" : "text-text-ghost"} />
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wide text-text-ghost">Streak</span>
          <span className="text-[13px] font-medium text-text-primary">
            {currentStreak} {currentStreak === 1 ? "week" : "weeks"}
          </span>
        </div>
      </div>

      <div className="h-8 w-px bg-border-subtle" />

      <div className="flex items-center gap-1.5">
        <Target size={15} strokeWidth={2} className={onTrackCount > 0 ? "text-accent" : "text-text-ghost"} />
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wide text-text-ghost">On track</span>
          <span className="text-[13px] font-medium text-text-primary">
            {onTrackCount} / {habitCount}
          </span>
        </div>
      </div>
    </div>
  );
}
