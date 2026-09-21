// components/habits/HabitRow.tsx
"use client";

import { Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/trpc";
import { DayCell } from "./DayCell";
import { HABIT_GRID_COLS } from "./gridCols";
import { computeHabitWeekStats, getDayStatus, toDateKey, type Habit } from "./lib";

interface HabitRowProps {
  habit: Habit;
  weekStart: Date;
  todayKey: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function HabitRow({ habit, weekStart, todayKey, onEdit, onDelete }: HabitRowProps) {
  const utils = api.useUtils();

  const setDay = api.habits.setDay.useMutation({
    onSuccess: () => utils.habits.list.invalidate(),
  });

  const stats = computeHabitWeekStats(habit, weekStart, todayKey);
  const pct = Math.round(stats.pct * 100);

  function toggle(dateKey: string) {
    const alreadyDone = stats.completedSet.has(dateKey);
    setDay.mutate({ habitId: habit.id, date: dateKey, completed: !alreadyDone });
  }

  function saveNote(dateKey: string, note: string) {
    setDay.mutate({ habitId: habit.id, date: dateKey, completed: true, note });
  }

  return (
    <div className={`${HABIT_GRID_COLS} border-b border-border-subtle px-4 last:border-b-0 hover:bg-surface-2`}>
      {/* Name, target, inline progress */}
      <div className="flex min-w-0 flex-col justify-center gap-1 py-2.5 pr-2">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-[13px] font-medium text-text-primary">{habit.name}</span>
          <span className="flex-shrink-0 text-[11px] text-text-ghost">{habit.weeklyTarget}d/wk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1 w-20 flex-shrink-0 overflow-hidden rounded-full bg-surface-3">
            <div
              className={`h-full rounded-full transition-[width] duration-300 ease-out ${
                stats.goalMet ? "bg-success" : "bg-accent"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[11px] text-text-tertiary">
            {stats.completedThisWeek}/{stats.weeklyTarget} · {pct}%
          </span>
        </div>
      </div>

      {/* 7 day cells — one grid column each, aligned with the header */}
      {stats.weekDates.map((date) => {
        const key = toDateKey(date);
        const status = getDayStatus(key, todayKey, stats.completedSet);
        const entry = stats.entryByDate.get(key);
        const isToday = key === todayKey;
        return (
          <div key={key} className={`flex h-full items-center justify-center ${isToday ? "bg-accent-muted" : ""}`}>
            <DayCell
              status={status}
              note={entry?.note ?? null}
              pending={setDay.isPending}
              onToggle={() => toggle(key)}
              onSaveNote={(note) => saveNote(key, note)}
            />
          </div>
        );
      })}

      {/* Row actions */}
      <div className="flex flex-shrink-0 items-center justify-end gap-0.5 py-2.5">
        <button
          type="button"
          onClick={onEdit}
          title="Edit habit"
          className="p-1 text-text-ghost transition-colors hover:text-text-primary"
        >
          <Pencil size={12} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Delete habit"
          className="p-1 text-text-ghost transition-colors hover:text-danger"
        >
          <Trash2 size={12} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
