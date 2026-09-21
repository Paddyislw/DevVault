// components/habits/HistoryList.tsx
"use client";

import { formatWeekRange, type WeekSummary } from "./lib";

interface HistoryListProps {
  weeks: WeekSummary[];
  onSelectWeek: (weekStart: Date) => void;
}

export function HistoryList({ weeks, onSelectWeek }: HistoryListProps) {
  if (weeks.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="label px-1 text-text-tertiary">History</h3>
      <div className="rounded-xl border border-border-default bg-surface-1">
        {weeks.map((w, i) => {
          const pct = Math.round(w.pct * 100);
          return (
            <button
              key={w.weekStart.toISOString()}
              type="button"
              onClick={() => onSelectWeek(w.weekStart)}
              className={`flex w-full items-center justify-between px-4 py-2 text-left text-[13px] transition-colors hover:bg-surface-2 ${
                i !== weeks.length - 1 ? "border-b border-border-subtle" : ""
              }`}
            >
              <span className="text-text-secondary">{formatWeekRange(w.weekStart)}</span>
              <span className="flex items-center gap-2">
                <span className="text-[11px] text-text-ghost">
                  {w.totalCompleted}/{w.totalExpected}
                </span>
                <span className={`font-medium ${pct >= 100 ? "text-success" : "text-text-tertiary"}`}>
                  {pct}%
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
