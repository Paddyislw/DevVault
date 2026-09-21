// components/habits/HabitsPage.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Target } from "lucide-react";
import { api } from "@/lib/trpc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HabitDashboard } from "./HabitDashboard";
import { HabitFormModal } from "./HabitFormModal";
import { computeHabitStats, type Habit } from "./lib";

type FormState = { mode: "create" } | { mode: "edit"; habit: Habit } | null;

export function HabitsPage() {
  const { data: habits = [], isLoading } = api.habits.list.useQuery();
  const utils = api.useUtils();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(null);

  useEffect(() => {
    if (habits.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !habits.some((h) => h.id === selectedId)) {
      setSelectedId(habits[0].id);
    }
  }, [habits, selectedId]);

  const deleteHabit = api.habits.delete.useMutation({
    onSuccess: () => utils.habits.list.invalidate(),
  });

  const selected = habits.find((h) => h.id === selectedId) ?? null;

  const weekSummary = useMemo(() => {
    if (habits.length === 0) return null;
    const total = habits.reduce((acc, h) => acc + computeHabitStats(h).completedThisWeek, 0);
    const target = habits.reduce((acc, h) => acc + h.weeklyTarget, 0);
    return { total, target };
  }, [habits]);

  function handleDelete(habit: Habit) {
    if (!confirm(`Delete "${habit.name}"? This removes its entire history.`)) return;
    deleteHabit.mutate({ id: habit.id });
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full flex-col overflow-hidden">
        <PageHeader
          title="Habit Tracker"
          subtitle={
            weekSummary
              ? `${weekSummary.total} / ${weekSummary.target} days this week across ${habits.length} habit${habits.length !== 1 ? "s" : ""}`
              : undefined
          }
        >
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
              {[1, 2].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-xl bg-surface-2" />
              ))}
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
              {habits.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {habits.map((h) => {
                    const s = computeHabitStats(h);
                    const active = h.id === selectedId;
                    return (
                      <button
                        key={h.id}
                        onClick={() => setSelectedId(h.id)}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          active
                            ? "border-accent bg-accent-muted text-accent"
                            : "border-border-default bg-surface-1 text-text-secondary hover:border-border-strong"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${s.goalMet ? "bg-success" : active ? "bg-accent" : "bg-text-ghost"}`}
                        />
                        {h.name}
                        <span className="text-[11px] text-text-ghost">
                          {s.completedThisWeek}/{h.weeklyTarget}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {selected && (
                <HabitDashboard
                  key={selected.id}
                  habit={selected}
                  onEdit={() => setFormState({ mode: "edit", habit: selected })}
                  onDelete={() => handleDelete(selected)}
                />
              )}
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
