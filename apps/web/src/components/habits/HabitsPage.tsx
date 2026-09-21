// components/habits/HabitsPage.tsx
"use client";

import { useMemo, useState } from "react";
import { Plus, Target } from "lucide-react";
import { api } from "@/lib/trpc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WeekNav } from "./WeekNav";
import { OverallProgress } from "./OverallProgress";
import { HabitTable } from "./HabitTable";
import { HistoryList } from "./HistoryList";
import { HabitFormModal } from "./HabitFormModal";
import {
  addWeeks,
  computeOverallStreak,
  computeOverallWeekStats,
  computeWeekHistory,
  isHabitActiveInWeek,
  startOfWeek,
  toDateKey,
  type Habit,
} from "./lib";

type FormState = { mode: "create" } | { mode: "edit"; habit: Habit } | null;

export function HabitsPage() {
  const { data: habits = [], isLoading } = api.habits.list.useQuery();
  const utils = api.useUtils();

  const today = useMemo(() => new Date(), []);
  const currentWeekStart = useMemo(() => startOfWeek(today), [today]);
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const [formState, setFormState] = useState<FormState>(null);

  const deleteHabit = api.habits.delete.useMutation({
    onSuccess: () => utils.habits.list.invalidate(),
  });

  const todayKey = toDateKey(today);
  const isCurrentWeek = weekStart.getTime() === currentWeekStart.getTime();

  const visibleHabits = useMemo(
    () => habits.filter((h) => isHabitActiveInWeek(h, weekStart)),
    [habits, weekStart],
  );

  const overall = useMemo(() => computeOverallWeekStats(habits, weekStart, today), [habits, weekStart, today]);
  const currentStreak = useMemo(() => computeOverallStreak(habits, today), [habits, today]);
  const history = useMemo(() => computeWeekHistory(habits, today), [habits, today]);

  function handleDelete(habit: Habit) {
    if (!confirm(`Delete "${habit.name}"? This removes its entire history.`)) return;
    deleteHabit.mutate({ id: habit.id });
  }

  const subtitle =
    habits.length === 0
      ? undefined
      : isCurrentWeek
        ? `${visibleHabits.length} habit${visibleHabits.length !== 1 ? "s" : ""} · ${overall.todayCompletedCount}/${visibleHabits.length} completed today`
        : `${visibleHabits.length} habit${visibleHabits.length !== 1 ? "s" : ""} this week`;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full flex-col overflow-hidden">
        <PageHeader title="Habit Tracker" subtitle={subtitle}>
          <button
            onClick={() => setFormState({ mode: "create" })}
            className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Plus size={14} strokeWidth={1.5} />
            New Habit
          </button>
        </PageHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col gap-3 p-6">
              <div className="h-16 animate-pulse rounded-xl bg-surface-2" />
              <div className="h-40 animate-pulse rounded-xl bg-surface-2" />
            </div>
          ) : habits.length === 0 ? (
            <div className="flex flex-col items-center gap-4 px-6 py-20">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
                <Target size={22} strokeWidth={1.5} className="text-text-ghost" />
              </div>
              <EmptyState message="No habits yet. Set a weekly goal and start tracking." />
              <button
                onClick={() => setFormState({ mode: "create" })}
                className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                <Plus size={14} strokeWidth={1.5} />
                Create your first habit
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-6">
              <WeekNav
                weekStart={weekStart}
                isCurrentWeek={isCurrentWeek}
                onPrev={() => setWeekStart((w) => addWeeks(w, -1))}
                onNext={() => setWeekStart((w) => addWeeks(w, 1))}
                onToday={() => setWeekStart(currentWeekStart)}
              />

              <OverallProgress
                overallPct={overall.overallPct}
                totalCompleted={overall.totalCompleted}
                totalExpected={overall.totalExpected}
                currentStreak={currentStreak}
                onTrackCount={overall.onTrackCount}
                habitCount={visibleHabits.length}
              />

              <HabitTable
                habits={visibleHabits}
                weekStart={weekStart}
                todayKey={todayKey}
                onEdit={(habit) => setFormState({ mode: "edit", habit })}
                onDelete={handleDelete}
              />

              <HistoryList weeks={history} onSelectWeek={setWeekStart} />
            </div>
          )}
        </div>

        <HabitFormModal
          open={formState !== null}
          onClose={() => setFormState(null)}
          habit={formState?.mode === "edit" ? formState.habit : null}
        />
      </div>
    </TooltipProvider>
  );
}
