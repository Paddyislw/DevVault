// components/habits/TodayCard.tsx
"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { api } from "@/lib/trpc";
import type { Habit, HabitStats } from "./lib";

interface TodayCardProps {
  habit: Habit;
  stats: HabitStats;
}

const TODAY_LABEL = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

export function TodayCard({ habit, stats }: TodayCardProps) {
  const utils = api.useUtils();
  const todayEntry = stats.entryByDate.get(stats.todayKey) ?? null;
  const done = stats.completedSet.has(stats.todayKey);

  const [note, setNote] = useState(todayEntry?.note ?? "");

  useEffect(() => {
    setNote(todayEntry?.note ?? "");
  }, [todayEntry?.note]);

  const setDay = api.habits.setDay.useMutation({
    onSuccess: () => utils.habits.list.invalidate(),
  });

  function markDone() {
    setDay.mutate({ habitId: habit.id, date: stats.todayKey, completed: true, note: note.trim() || undefined });
  }

  function undo() {
    setDay.mutate({ habitId: habit.id, date: stats.todayKey, completed: false });
  }

  function saveNote() {
    if (!done) return;
    setDay.mutate({ habitId: habit.id, date: stats.todayKey, completed: true, note: note.trim() });
  }

  const noteDirty = done && note.trim() !== (todayEntry?.note ?? "");

  return (
    <div
      className={`flex flex-1 flex-col rounded-xl border p-5 transition-colors duration-300 ${
        done ? "border-accent bg-accent-muted" : "border-border-default bg-surface-1"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="label text-text-secondary">Today</h3>
        <span className="text-[11px] text-text-ghost">{TODAY_LABEL}</span>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={done ? undo : markDone}
          disabled={setDay.isPending}
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 active:scale-90 ${
            done
              ? "border-accent bg-accent text-accent-foreground"
              : "border-border-strong text-transparent hover:border-accent"
          }`}
        >
          <Check
            size={20}
            strokeWidth={2.5}
            className={`transition-transform duration-200 ${done ? "scale-100 animate-in zoom-in-50" : "scale-0"}`}
          />
        </button>

        <div className="flex flex-col">
          <span className="text-[15px] font-medium text-text-primary">{habit.name}</span>
          <span className="text-[12px] text-text-tertiary">
            {done ? "Completed — nice work" : "Not logged yet"}
          </span>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-1.5">
        <span className="text-[11px] text-text-ghost">What did you accomplish today?</span>
        <div className="flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (done) saveNote();
                else markDone();
              }
            }}
            maxLength={200}
            placeholder={habit.name ? `e.g. "${habit.name.toLowerCase()}..."` : "Add a quick note (optional)"}
            className="flex-1 rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-sm text-text-primary placeholder:text-text-ghost focus:border-accent focus:outline-none"
          />
          {!done ? (
            <button
              type="button"
              onClick={markDone}
              disabled={setDay.isPending}
              className="flex-shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Mark done
            </button>
          ) : (
            noteDirty && (
              <button
                type="button"
                onClick={saveNote}
                disabled={setDay.isPending}
                className="flex-shrink-0 rounded-lg border border-border-default bg-surface-0 px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary disabled:opacity-40"
              >
                Save
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
