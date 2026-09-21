// components/habits/WeekStrip.tsx
"use client";

import { Sparkles } from "lucide-react";
import { api } from "@/lib/trpc";
import { DayCell } from "./DayCell";
import { DAY_LABELS, getDayStatus, toDateKey, type Habit, type HabitStats } from "./lib";

interface WeekStripProps {
  habit: Habit;
  stats: HabitStats;
}

export function WeekStrip({ habit, stats }: WeekStripProps) {
  const utils = api.useUtils();

  const setDay = api.habits.setDay.useMutation({
    onSuccess: () => utils.habits.list.invalidate(),
  });

  const { thisWeekDates, todayKey, completedSet, entryByDate, completedThisWeek, weeklyTarget, goalMet, remainingDays } = stats;

  function toggle(dateKey: string) {
    const alreadyDone = completedSet.has(dateKey);
    setDay.mutate({ habitId: habit.id, date: dateKey, completed: !alreadyDone });
  }

  function saveNote(dateKey: string, note: string) {
    setDay.mutate({ habitId: habit.id, date: dateKey, completed: true, note });
  }

  const barProgress = Math.min(1, completedThisWeek / weeklyTarget);

  return (
    <div className="rounded-xl border border-border-default bg-surface-1 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="label text-text-secondary">This Week</h3>
          {goalMet && (
            <span className="flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-semibold text-success">
              <Sparkles size={10} strokeWidth={2} />
              Goal reached
            </span>
          )}
        </div>
        <span className="text-[12px] text-text-tertiary">
          <span className={`font-semibold ${goalMet ? "text-success" : "text-text-primary"}`}>
            {completedThisWeek}
          </span>
          {" / "}
          {weeklyTarget} days
          {remainingDays > 0 && (
            <span className="text-text-ghost"> · {remainingDays} day{remainingDays !== 1 ? "s" : ""} left</span>
          )}
        </span>
      </div>

      <div className="mb-4 flex gap-2">
        {thisWeekDates.map((date, i) => {
          const key = toDateKey(date);
          const status = getDayStatus(key, todayKey, completedSet);
          const entry = entryByDate.get(key);
          return (
            <DayCell
              key={key}
              dayLabel={DAY_LABELS[i]}
              dayNumber={date.getDate()}
              status={status}
              isToday={key === todayKey}
              note={entry?.note ?? null}
              pending={setDay.isPending}
              onToggle={() => toggle(key)}
              onSaveNote={(note) => saveNote(key, note)}
            />
          );
        })}
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${goalMet ? "bg-success" : "bg-accent"}`}
          style={{ width: `${barProgress * 100}%` }}
        />
      </div>
    </div>
  );
}
