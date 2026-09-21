// components/habits/HeroCard.tsx
"use client";

import { Flame, Pencil, Trash2, Trophy } from "lucide-react";
import { ProgressRing } from "./ProgressRing";
import type { Habit, HabitStats } from "./lib";

interface HeroCardProps {
  habit: Habit;
  stats: HabitStats;
  onEdit: () => void;
  onDelete: () => void;
}

export function HeroCard({ habit, stats, onEdit, onDelete }: HeroCardProps) {
  const { completedThisWeek, weeklyTarget, goalMet, currentStreak, bestStreak } = stats;
  const pct = Math.round(Math.min(1, completedThisWeek / weeklyTarget) * 100);

  return (
    <div className="flex flex-1 flex-col rounded-xl border border-border-default bg-surface-1 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl leading-tight text-text-primary normal-case">
            {habit.name}
          </h2>
          {habit.description && (
            <p className="mt-1 text-[12px] text-text-tertiary">{habit.description}</p>
          )}
          <p className="mt-1 text-[11px] text-text-ghost">Target · {weeklyTarget} days / week</p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            title="Edit habit"
            className="p-1.5 text-text-tertiary transition-colors hover:text-text-primary"
          >
            <Pencil size={14} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete habit"
            className="p-1.5 text-text-tertiary transition-colors hover:text-danger"
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-center gap-5">
        <ProgressRing progress={completedThisWeek / weeklyTarget} complete={goalMet} size={96} strokeWidth={7}>
          <div className="flex flex-col items-center">
            <span className="text-xl font-semibold text-text-primary">{pct}%</span>
            <span className="text-[10px] text-text-ghost">this week</span>
          </div>
        </ProgressRing>

        <div className="flex flex-1 flex-col gap-2.5">
          <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
            <Flame size={15} strokeWidth={2} className={currentStreak > 0 ? "text-accent" : "text-text-ghost"} />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-text-primary">
                {currentStreak} {currentStreak === 1 ? "week" : "weeks"}
              </span>
              <span className="text-[10px] text-text-ghost">current streak</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
            <Trophy size={15} strokeWidth={2} className={bestStreak > 0 ? "text-accent" : "text-text-ghost"} />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-text-primary">
                {bestStreak} {bestStreak === 1 ? "week" : "weeks"}
              </span>
              <span className="text-[10px] text-text-ghost">best streak</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
