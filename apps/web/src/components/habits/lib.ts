// components/habits/lib.ts
//
// All date math and derived stats live here as pure functions over the raw
// habits + entries the server returns. The server stays a dumb persistence
// layer; this is the single source of truth for "what does this data mean"
// — weekly progress, streaks, carry-forward visibility, history — so the
// UI components never disagree with each other.

import type { RouterOutputs } from "@/lib/trpc";

export type Habit = RouterOutputs["habits"]["list"][number];

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Local calendar date -> "YYYY-MM-DD". Never use toISOString() for this — it
 * shifts to UTC and can land on the wrong day depending on the viewer's timezone. */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday=0 .. Sunday=6 */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - mondayIndex(copy));
  return copy;
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function addWeeks(weekStart: Date, n: number): Date {
  return addDays(weekStart, n * 7);
}

export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  const startStr = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endStr = end.toLocaleDateString("en-US", sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" });
  return `${startStr} – ${endStr}`;
}

export type DayStatus = "completed" | "missed" | "today" | "upcoming";

export function getDayStatus(dateKey: string, todayKey: string, completedSet: Set<string>): DayStatus {
  if (completedSet.has(dateKey)) return "completed";
  if (dateKey === todayKey) return "today";
  if (dateKey > todayKey) return "upcoming";
  return "missed";
}

// ─── Carry-forward visibility ──────────────────────────────────────────────

/** Does this habit show up on the grid for the given week? */
export function isHabitActiveInWeek(habit: Habit, weekStart: Date): boolean {
  const creationWeek = startOfWeek(new Date(habit.createdAt));
  if (weekStart.getTime() < creationWeek.getTime()) return false;
  if (weekStart.getTime() === creationWeek.getTime()) return true;
  return habit.carryForward;
}

/** Earliest week any of the given habits could appear in. */
export function earliestActiveWeek(habits: Habit[], fallback: Date): Date {
  if (habits.length === 0) return startOfWeek(fallback);
  const earliest = habits.reduce(
    (min, h) => Math.min(min, startOfWeek(new Date(h.createdAt)).getTime()),
    Infinity,
  );
  return new Date(earliest);
}

// ─── Per-habit, per-week stats ──────────────────────────────────────────────

export interface HabitWeekStats {
  weekDates: Date[];
  completedSet: Set<string>;
  entryByDate: Map<string, { date: string; note: string | null }>;
  completedThisWeek: number;
  weeklyTarget: number;
  remainingDays: number;
  goalMet: boolean;
  pct: number; // 0..1, capped at 1
}

export function computeHabitWeekStats(habit: Habit, weekStart: Date, todayKey: string): HabitWeekStats {
  const completedSet = new Set(habit.entries.map((e) => e.date));
  const entryByDate = new Map(habit.entries.map((e) => [e.date, e]));
  const weekDates = getWeekDates(weekStart);
  const weekKeys = weekDates.map(toDateKey);

  const completedThisWeek = weekKeys.filter((k) => completedSet.has(k)).length;
  const remainingDays = weekKeys.filter((k) => k > todayKey).length;
  const goalMet = completedThisWeek >= habit.weeklyTarget;

  return {
    weekDates,
    completedSet,
    entryByDate,
    completedThisWeek,
    weeklyTarget: habit.weeklyTarget,
    remainingDays,
    goalMet,
    pct: habit.weeklyTarget > 0 ? Math.min(1, completedThisWeek / habit.weeklyTarget) : 0,
  };
}

function weekTotals(habits: Habit[], weekStart: Date, todayKey: string) {
  const visible = habits.filter((h) => isHabitActiveInWeek(h, weekStart));
  let totalCompleted = 0;
  let totalExpected = 0;
  let onTrackCount = 0;

  for (const h of visible) {
    const s = computeHabitWeekStats(h, weekStart, todayKey);
    totalCompleted += s.completedThisWeek;
    totalExpected += s.weeklyTarget;
    if (s.completedThisWeek + s.remainingDays >= s.weeklyTarget) onTrackCount += 1;
  }

  return { visible, totalCompleted, totalExpected, onTrackCount };
}

// ─── Overall (all-habits) stats for one week ───────────────────────────────

export interface OverallWeekStats {
  visibleHabits: Habit[];
  totalCompleted: number;
  totalExpected: number;
  overallPct: number; // 0..1
  onTrackCount: number;
  todayCompletedCount: number;
}

export function computeOverallWeekStats(habits: Habit[], weekStart: Date, today: Date): OverallWeekStats {
  const todayKey = toDateKey(today);
  const { visible, totalCompleted, totalExpected, onTrackCount } = weekTotals(habits, weekStart, todayKey);

  const todayCompletedCount = visible.filter((h) => h.entries.some((e) => e.date === todayKey)).length;

  return {
    visibleHabits: visible,
    totalCompleted,
    totalExpected,
    overallPct: totalExpected > 0 ? totalCompleted / totalExpected : 0,
    onTrackCount,
    todayCompletedCount,
  };
}

// ─── Overall current streak (consecutive weeks fully met) ─────────────────

export function computeOverallStreak(habits: Habit[], today: Date): number {
  if (habits.length === 0) return 0;
  const todayKey = toDateKey(today);
  const currentWeekStart = startOfWeek(today);
  const firstWeek = earliestActiveWeek(habits, today);

  const weeks: { met: boolean; isCurrent: boolean }[] = [];
  for (let cursor = new Date(firstWeek); cursor <= currentWeekStart; cursor = addWeeks(cursor, 1)) {
    const { totalCompleted, totalExpected } = weekTotals(habits, cursor, todayKey);
    weeks.push({
      met: totalExpected === 0 || totalCompleted >= totalExpected,
      isCurrent: cursor.getTime() === currentWeekStart.getTime(),
    });
  }

  let streak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    const w = weeks[i];
    if (w.isCurrent) {
      if (w.met) streak += 1;
      continue;
    }
    if (w.met) streak += 1;
    else break;
  }
  return streak;
}

// ─── Week history (compact summaries for past weeks) ───────────────────────

export interface WeekSummary {
  weekStart: Date;
  pct: number;
  totalCompleted: number;
  totalExpected: number;
}

export function computeWeekHistory(habits: Habit[], today: Date, maxWeeks = 8): WeekSummary[] {
  if (habits.length === 0) return [];
  const todayKey = toDateKey(today);
  const currentWeekStart = startOfWeek(today);
  const firstWeek = earliestActiveWeek(habits, today);

  const summaries: WeekSummary[] = [];
  for (let cursor = addWeeks(currentWeekStart, -1); cursor >= firstWeek; cursor = addWeeks(cursor, -1)) {
    const { totalCompleted, totalExpected } = weekTotals(habits, cursor, todayKey);
    if (totalExpected === 0) continue;
    summaries.push({
      weekStart: new Date(cursor),
      pct: totalCompleted / totalExpected,
      totalCompleted,
      totalExpected,
    });
    if (summaries.length >= maxWeeks) break;
  }
  return summaries;
}
