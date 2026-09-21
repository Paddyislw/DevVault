// components/habits/lib.ts
//
// All date math and derived stats (streaks, weekly progress, history) live
// here as pure functions over the raw habit + entries the server returns.
// The server stays a dumb persistence layer; this is the single source of
// truth for "what does this data mean" so UI pieces never disagree.

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

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
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

export interface WeekBucket {
  start: Date;
  keys: string[];
  count: number;
  target: number;
  met: boolean;
  isCurrent: boolean;
}

export interface HabitStats {
  todayKey: string;
  completedSet: Set<string>;
  entryByDate: Map<string, { date: string; note: string | null }>;
  thisWeekStart: Date;
  thisWeekDates: Date[];
  completedThisWeek: number;
  weeklyTarget: number;
  goalMet: boolean;
  remainingDays: number;
  currentStreak: number;
  bestStreak: number;
  /** Ascending, oldest first — from the habit's creation week through this week. */
  weeks: WeekBucket[];
}

export function computeHabitStats(habit: Habit, today: Date = new Date()): HabitStats {
  const completedSet = new Set(habit.entries.map((e) => e.date));
  const entryByDate = new Map(habit.entries.map((e) => [e.date, e]));
  const todayKey = toDateKey(today);
  const thisWeekStart = startOfWeek(today);
  const thisWeekDates = getWeekDates(thisWeekStart);
  const thisWeekKeys = thisWeekDates.map(toDateKey);

  const completedThisWeek = thisWeekKeys.filter((k) => completedSet.has(k)).length;
  const goalMet = completedThisWeek >= habit.weeklyTarget;
  const remainingDays = thisWeekKeys.filter((k) => k > todayKey).length;

  // Bucket every week from the habit's creation through the current week.
  const createdAt = new Date(habit.createdAt);
  const firstWeekStart = startOfWeek(createdAt);
  const weeks: WeekBucket[] = [];
  for (let cursor = new Date(firstWeekStart); cursor <= thisWeekStart; cursor = addDays(cursor, 7)) {
    const keys = getWeekDates(cursor).map(toDateKey);
    const count = keys.filter((k) => completedSet.has(k)).length;
    weeks.push({
      start: new Date(cursor),
      keys,
      count,
      target: habit.weeklyTarget,
      met: count >= habit.weeklyTarget,
      isCurrent: cursor.getTime() === thisWeekStart.getTime(),
    });
  }

  // Current streak: walk backward from the current week. An in-progress
  // week counts the moment it hits target, but never *breaks* the streak
  // while it's still open — only a fully-elapsed miss does that.
  let currentStreak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    const w = weeks[i];
    if (w.isCurrent) {
      if (w.met) currentStreak += 1;
      continue;
    }
    if (w.met) currentStreak += 1;
    else break;
  }

  // Best streak: longest run of met weeks anywhere in history.
  let bestStreak = 0;
  let run = 0;
  for (const w of weeks) {
    if (w.met) {
      run += 1;
      bestStreak = Math.max(bestStreak, run);
    } else if (!w.isCurrent) {
      run = 0;
    }
  }

  return {
    todayKey,
    completedSet,
    entryByDate,
    thisWeekStart,
    thisWeekDates,
    completedThisWeek,
    weeklyTarget: habit.weeklyTarget,
    goalMet,
    remainingDays,
    currentStreak,
    bestStreak,
    weeks,
  };
}
