// components/habits/HabitDashboard.tsx
"use client";

import { useMemo } from "react";
import { HeroCard } from "./HeroCard";
import { TodayCard } from "./TodayCard";
import { WeekStrip } from "./WeekStrip";
import { HistoryHeatmap } from "./HistoryHeatmap";
import { computeHabitStats, type Habit } from "./lib";

interface HabitDashboardProps {
  habit: Habit;
  onEdit: () => void;
  onDelete: () => void;
}

export function HabitDashboard({ habit, onEdit, onDelete }: HabitDashboardProps) {
  const stats = useMemo(() => computeHabitStats(habit), [habit]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <HeroCard habit={habit} stats={stats} onEdit={onEdit} onDelete={onDelete} />
        <TodayCard habit={habit} stats={stats} />
      </div>

      <WeekStrip habit={habit} stats={stats} />

      <HistoryHeatmap stats={stats} />
    </div>
  );
}
