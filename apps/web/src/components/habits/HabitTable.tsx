// components/habits/HabitTable.tsx
"use client";

import { HabitRow } from "./HabitRow";
import { HABIT_GRID_COLS } from "./gridCols";
import { DAY_LABELS, getWeekDates, toDateKey, type Habit } from "./lib";

interface HabitTableProps {
  habits: Habit[];
  weekStart: Date;
  todayKey: string;
  onEdit: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
}

export function HabitTable({ habits, weekStart, todayKey, onEdit, onDelete }: HabitTableProps) {
  const weekDates = getWeekDates(weekStart);

  return (
    <div className="overflow-x-auto rounded-xl border border-border-default bg-surface-1">
      <div className="min-w-[560px]">
        {/* Header */}
        <div className={`${HABIT_GRID_COLS} border-b border-border-subtle px-4`}>
          <span className="label flex items-center py-2.5 text-text-tertiary">Habit</span>
          {weekDates.map((date, i) => {
            const key = toDateKey(date);
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                className={`flex h-full flex-col items-center justify-center gap-0.5 py-2 ${isToday ? "bg-accent-muted" : ""}`}
              >
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? "text-accent" : "text-text-ghost"}`}>
                  {DAY_LABELS[i]}
                </span>
                {isToday && (
                  <span className="text-[8px] font-semibold uppercase tracking-wide text-accent">Today</span>
                )}
              </div>
            );
          })}
          <span />
        </div>

        {/* Rows */}
        {habits.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13px] text-text-ghost">
            No habits this week.
          </div>
        ) : (
          habits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              weekStart={weekStart}
              todayKey={todayKey}
              onEdit={() => onEdit(habit)}
              onDelete={() => onDelete(habit)}
            />
          ))
        )}
      </div>
    </div>
  );
}
