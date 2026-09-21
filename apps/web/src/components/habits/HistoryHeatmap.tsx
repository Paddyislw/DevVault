// components/habits/HistoryHeatmap.tsx
"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatWeekRange, type HabitStats } from "./lib";

interface HistoryHeatmapProps {
  stats: HabitStats;
}

const MAX_WEEKS = 8;

export function HistoryHeatmap({ stats }: HistoryHeatmapProps) {
  // Past, fully-elapsed weeks only — the current week already has its own view.
  const pastWeeks = stats.weeks
    .filter((w) => !w.isCurrent)
    .slice(-MAX_WEEKS)
    .reverse();

  return (
    <div className="rounded-xl border border-border-default bg-surface-1 p-5">
      <h3 className="label mb-4 text-text-secondary">History</h3>

      {pastWeeks.length === 0 ? (
        <p className="py-4 text-center text-[12px] text-text-ghost">
          No previous weeks yet — check back after this one wraps up.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {pastWeeks.map((week) => {
            const met = week.met;
            return (
              <div key={week.start.toISOString()} className="flex items-center gap-3">
                <span className="w-[92px] flex-shrink-0 text-[11px] text-text-ghost">
                  {formatWeekRange(week.start)}
                </span>
                <div className="flex flex-1 gap-1">
                  {week.keys.map((key) => {
                    const entry = stats.entryByDate.get(key);
                    const done = !!entry;
                    const square = (
                      <div
                        className={`h-4 flex-1 rounded-[3px] ${
                          done ? "bg-accent" : "bg-surface-3"
                        }`}
                      />
                    );
                    return entry ? (
                      <Tooltip key={key}>
                        <TooltipTrigger asChild>{square}</TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[180px] text-center normal-case">
                          {entry.note || key}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <div key={key}>{square}</div>
                    );
                  })}
                </div>
                <span
                  className={`w-9 flex-shrink-0 text-right text-[11px] font-medium ${
                    met ? "text-success" : "text-text-tertiary"
                  }`}
                >
                  {week.count}/{week.target}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
