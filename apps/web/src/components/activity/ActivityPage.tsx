"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  CheckCircle2,
  RotateCcw,
  Trash2,
  Pencil,
} from "lucide-react";
import { api } from "@/lib/trpc";
import type { RouterOutputs } from "@/lib/trpc";
import { EmptyState } from "@/components/shared/empty-state";

type ActivityLog = {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const FILTERS = [
  { key: null, label: "All" },
  { key: "task.created", label: "Created" },
  { key: "task.completed", label: "Completed" },
  { key: "task.reopened", label: "Reopened" },
  { key: "task.deleted", label: "Deleted" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

type ActionConfig = { label: string; icon: typeof Plus; color: string };

const ACTION_CONFIG: Record<string, ActionConfig> = {
  "task.created": {
    label: "Created",
    icon: Plus,
    color: "text-green-600 bg-green-50",
  },
  "task.completed": {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-accent bg-accent-subtle",
  },
  "task.reopened": {
    label: "Reopened",
    icon: RotateCcw,
    color: "text-blue-600 bg-blue-50",
  },
  "task.deleted": {
    label: "Deleted",
    icon: Trash2,
    color: "text-red-500 bg-red-50",
  },
  "task.updated": {
    label: "Updated",
    icon: Pencil,
    color: "text-text-secondary bg-surface-2",
  },
};

const DEFAULT_CONFIG: ActionConfig = {
  label: "Action",
  icon: Plus,
  color: "text-text-secondary bg-surface-2",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRelativeTime(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ActivityPage() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>(null);

  // Fetch all logs once, filter client-side
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawLogs, isLoading } = api.activity.list.useQuery({
    limit: 100,
  }) as { data: ActivityLog[] | undefined; isLoading: boolean };
  const allLogs = rawLogs ?? [];

  const logs = useMemo(
    () =>
      activeFilter
        ? allLogs.filter((l) => l.action === activeFilter)
        : allLogs,
    [allLogs, activeFilter],
  );

  // Group by day
  const grouped = useMemo(() => {
    const groups: Record<string, ActivityLog[]> = {};
    for (const log of logs) {
      const day = new Date(log.createdAt).toDateString();
      if (!groups[day]) groups[day] = [];
      groups[day].push(log);
    }
    return groups;
  }, [logs]);

  const dayKeys = Object.keys(grouped);

  // Count per action type
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const log of allLogs) {
      c[log.action] = (c[log.action] ?? 0) + 1;
    }
    return c;
  }, [allLogs]);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="border-b border-border-subtle px-6 py-4">
          <div className="h-8 w-32 animate-pulse rounded bg-surface-2" />
        </div>
        <div className="space-y-2 px-6 pt-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded bg-surface-2"
              style={{ opacity: 1 - i * 0.15 }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-end justify-between border-b border-border-subtle px-6 py-4">
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-[32px] leading-none text-text-primary">
              Activity
            </h1>
            <p className="text-[12px] text-text-tertiary tracking-wide">
              {logs.length} event{logs.length !== 1 ? "s" : ""}
              {activeFilter
                ? ` — ${ACTION_CONFIG[activeFilter]?.label ?? activeFilter}`
                : ""}
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter chips ── */}
      <div className="flex items-center gap-1.5 border-b border-border-subtle px-6 py-2.5">
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          const count: number = f.key ? counts[f.key] ?? 0 : allLogs.length;
          return (
            <button
              key={f.key ?? "all"}
              onClick={() => setActiveFilter(f.key)}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[12px] font-medium transition-colors ${
                isActive
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
              }`}
            >
              {f.label}
              <span
                className={`text-[10px] ${
                  isActive ? "text-white/70" : "text-text-ghost"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Timeline ── */}
      <div className="flex-1 overflow-y-auto py-4">
        {dayKeys.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              message={
                activeFilter ? "No matching activity." : "No activity yet."
              }
            />
          </div>
        ) : (
          <div className="space-y-5">
            {dayKeys.map((day) => (
              <div key={day}>
                {/* Day header */}
                <div className="flex items-center gap-3 px-6 mb-2">
                  <p className="label text-text-tertiary whitespace-nowrap">
                    {new Date(day).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <div className="h-px flex-1 bg-border-subtle" />
                </div>

                {/* Entries */}
                <div className="px-3">
                  {(grouped[day] as ActivityLog[]).map((log) => {
                    const meta = log.metadata as Record<string, unknown> | null;
                    const title = meta?.title ? String(meta.title) : null;
                    const config = ACTION_CONFIG[log.action] ?? DEFAULT_CONFIG;
                    const Icon = config.icon;

                    const workspace = meta?.workspace
                      ? String(meta.workspace)
                      : null;
                    const workspaceColor = meta?.workspaceColor
                      ? String(meta.workspaceColor)
                      : null;

                    return (
                      <div
                        key={log.id}
                        className="group flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-surface-2"
                      >
                        {/* Icon */}
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${config.color}`}
                        >
                          <Icon size={14} strokeWidth={1.5} />
                        </div>

                        {/* Content — reads as: "Created · Buy groceries" */}
                        <div className="flex flex-1 items-center gap-2 min-w-0">
                          <span className="text-[13px] font-medium text-text-primary shrink-0">
                            {config.label}
                          </span>
                          {title && (
                            <>
                              <span className="text-text-ghost">·</span>
                              <span className="text-[13px] text-text-secondary truncate">
                                {title}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Workspace pill */}
                        {workspace && (
                          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border-subtle px-2 py-0.5 text-[11px] text-text-tertiary sm:flex">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{
                                backgroundColor: workspaceColor ?? "#3b82f6",
                              }}
                            />
                            {workspace}
                          </span>
                        )}

                        {/* Time */}
                        <span className="text-[11px] text-text-ghost group-hover:text-text-tertiary transition-colors shrink-0 tabular-nums">
                          {formatTime(log.createdAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
