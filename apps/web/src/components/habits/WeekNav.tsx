// components/habits/WeekNav.tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatWeekRange } from "./lib";

interface WeekNavProps {
  weekStart: Date;
  isCurrentWeek: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function WeekNav({ weekStart, isCurrentWeek, onPrev, onNext, onToday }: WeekNavProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrev}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-2 hover:text-text-primary"
          title="Previous week"
        >
          <ChevronLeft size={15} strokeWidth={1.75} />
        </button>
        <span className="min-w-[130px] text-center text-[13px] font-medium text-text-primary">
          {formatWeekRange(weekStart)}
        </span>
        <button
          type="button"
          onClick={onNext}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-2 hover:text-text-primary"
          title="Next week"
        >
          <ChevronRight size={15} strokeWidth={1.75} />
        </button>
      </div>

      {!isCurrentWeek && (
        <button
          type="button"
          onClick={onToday}
          className="rounded-md border border-border-default px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
        >
          Today
        </button>
      )}
    </div>
  );
}
