// components/tasks/TasksPage.tsx
"use client";

import { useMemo, useState } from "react";
import { PriorityGroup } from "./PriorityGroup";
import { api } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { AddTaskModal } from "./AddTaskModal";
import type { RouterOutputs } from "@/lib/trpc";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { RotateCcw, CheckCircle2 } from "lucide-react";

type Task = RouterOutputs["tasks"]["list"][number];
type ViewTab = "today" | "completed";

const PRIORITY_ORDER = ["P1", "P2", "P3", "P4"] as const;

function formatTodayHeading() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatCompletedDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (dateOnly.getTime() === today.getTime()) return "Today";
  if (dateOnly.getTime() === yesterday.getTime()) return "Yesterday";

  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function TasksPage() {
  const [viewTab, setViewTab] = useState<ViewTab>("today");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<string | null>(null);
  const [stickyWorkspaceId, setStickyWorkspaceId] = useState<string | null>(
    null,
  );

  const { data: workspaces = [] } = api.workspaces.list.useQuery();

  // ── Today data ────────────────────────────────────────────────────────────
  const {
    data: tasks = [],
    isLoading,
    refetch,
  } = api.tasks.listToday.useQuery(undefined, { enabled: viewTab === "today" });

  const queryClient = useQueryClient();
  const queryKey = getQueryKey(api.tasks.listToday, undefined, "query");

  // ── Completed data ────────────────────────────────────────────────────────
  const {
    data: completedTasks = [],
    isLoading: completedLoading,
    refetch: refetchCompleted,
  } = api.tasks.list.useQuery(
    { status: "DONE" as any },
    { enabled: viewTab === "completed" },
  );

  // Filter tasks by workspace
  const filteredTasks = useMemo(
    () =>
      activeWorkspace
        ? tasks.filter((t) => t.workspace.id === activeWorkspace)
        : tasks,
    [tasks, activeWorkspace],
  );

  const filteredCompleted = useMemo(
    () =>
      activeWorkspace
        ? completedTasks.filter((t) => t.workspace.id === activeWorkspace)
        : completedTasks,
    [completedTasks, activeWorkspace],
  );

  // Group completed by date
  const completedGrouped = useMemo(() => {
    const groups = new Map<string, typeof filteredCompleted>();
    for (const task of filteredCompleted) {
      const key = formatCompletedDate(task.updatedAt);
      const list = groups.get(key) ?? [];
      list.push(task);
      groups.set(key, list);
    }
    return groups;
  }, [filteredCompleted]);

  const completeMutation = api.tasks.complete.useMutation({
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousTasks = tasks;
      const updatedTasks = tasks.map((task) => {
        if (task.id === id) {
          return { ...task, status: completed ? "DONE" : "TODO" };
        }
        return task;
      });
      queryClient.setQueryData(queryKey, updatedTasks);
      return { previousTasks, updatedTasks };
    },
    onError: (_err, _input, context) => {
      queryClient.setQueryData(queryKey, context?.previousTasks);
    },
    onSettled: () => {
      refetch();
      refetchCompleted();
    },
  });

  const handleComplete = (id: string, completed: boolean) => {
    completeMutation.mutate({ id, completed });
  };

  const handleReopen = (id: string) => {
    completeMutation.mutate({ id, completed: false });
  };

  // Group filtered tasks by priority
  const grouped = useMemo(() => {
    const groups: Record<string, typeof filteredTasks> = {
      P1: [],
      P2: [],
      P3: [],
      P4: [],
    };
    for (const task of filteredTasks) {
      if (groups[task.priority]) {
        groups[task.priority].push(task);
      }
    }
    return groups;
  }, [filteredTasks]);

  const incompleteCounts = useMemo(() => {
    return filteredTasks.reduce(
      (acc, task) => {
        if (task.status !== "DONE") {
          acc[task.priority] = (acc[task.priority] ?? 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [filteredTasks]);

  useGlobalShortcuts({ n: () => setModalOpen(true) });

  const totalTasks = filteredTasks.length;
  const doneTasks = filteredTasks.filter((t) => t.status === "DONE").length;

  const workspaceCounts = useMemo(() => {
    const source = viewTab === "today" ? tasks : completedTasks;
    const c: Record<string, number> = {};
    for (const t of source) {
      c[t.workspace.id] = (c[t.workspace.id] ?? 0) + 1;
    }
    return c;
  }, [tasks, completedTasks, viewTab]);

  const defaultWorkspaceForModal =
    stickyWorkspaceId ?? activeWorkspace ?? undefined;

  // ── Loading ──
  const isLoadingCurrent = viewTab === "today" ? isLoading : completedLoading;
  if (isLoadingCurrent) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-2 w-full max-w-lg px-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-md bg-surface-2"
              style={{ opacity: 1 - i * 0.2 }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Page header ── */}
      <div className="flex items-end justify-between border-b border-border-subtle px-6 py-4">
        {/* Left: tab toggle + stats */}
        <div className="flex items-end gap-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setViewTab("today")}
              className={`relative font-display text-[32px] leading-none transition-colors ${
                viewTab === "today"
                  ? "text-text-primary"
                  : "text-text-ghost hover:text-text-tertiary"
              }`}
            >
              Today
              {viewTab === "today" && (
                <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-accent rounded-full" />
              )}
            </button>
            <button
              onClick={() => setViewTab("completed")}
              className={`relative font-display text-[32px] leading-none transition-colors ${
                viewTab === "completed"
                  ? "text-text-primary"
                  : "text-text-ghost hover:text-text-tertiary"
              }`}
            >
              Completed
              {viewTab === "completed" && (
                <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-accent rounded-full" />
              )}
            </button>
          </div>

          {/* Stats bar — only for today tab */}
          {viewTab === "today" && (
            <div className="flex items-center gap-1.5 mt-1">
              {(["P1", "P2", "P3", "P4"] as const)
                .filter((p) => (incompleteCounts[p] ?? 0) > 0)
                .map((p) => (
                  <span
                    key={p}
                    className={`badge-${p.toLowerCase()} px-2 py-0.5 text-[11px] font-medium rounded`}
                  >
                    {p} · {incompleteCounts[p]}
                  </span>
                ))}
            </div>
          )}

          {/* Subtitle for today */}
          {viewTab === "today" && (
            <p className="text-[12px] text-text-tertiary tracking-wide mb-0.5 ml-1">
              {formatTodayHeading()}
            </p>
          )}
        </div>

        {/* Right: progress + button */}
        <div className="flex items-center gap-4">
          {viewTab === "today" && totalTasks > 0 && (
            <div className="flex items-center gap-3">
              <div className="h-1 w-24 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${(doneTasks / totalTasks) * 100}%` }}
                />
              </div>
              <span className="text-[12px] text-text-tertiary">
                {doneTasks}/{totalTasks}
              </span>
            </div>
          )}

          {viewTab === "completed" && (
            <span className="text-[12px] text-text-tertiary">
              {filteredCompleted.length} task
              {filteredCompleted.length !== 1 ? "s" : ""}
            </span>
          )}

          {viewTab === "today" && (
            <button
              onClick={() => setModalOpen(true)}
              className="px-3 py-1.5 text-sm bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity"
            >
              + New Task
            </button>
          )}
        </div>
      </div>

      {/* ── Workspace filter tabs ── */}
      {workspaces.length > 1 && (
        <div className="flex items-center gap-1.5 border-b border-border-subtle px-6 py-2.5">
          <button
            onClick={() => setActiveWorkspace(null)}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[12px] font-medium transition-colors ${
              activeWorkspace === null
                ? "bg-accent text-white"
                : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
            }`}
          >
            All
            <span
              className={`text-[10px] ${activeWorkspace === null ? "text-white/70" : "text-text-ghost"}`}
            >
              {viewTab === "today" ? tasks.length : completedTasks.length}
            </span>
          </button>
          {workspaces.map((ws) => {
            const isActive = activeWorkspace === ws.id;
            const count = workspaceCounts[ws.id] ?? 0;
            return (
              <button
                key={ws.id}
                onClick={() => setActiveWorkspace(isActive ? null : ws.id)}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  isActive
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${isActive ? "opacity-80" : ""}`}
                  style={{ backgroundColor: ws.color ?? "#3b82f6" }}
                />
                {ws.name}
                <span
                  className={`text-[10px] ${isActive ? "text-white/70" : "text-text-ghost"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto py-3">
        {viewTab === "today" ? (
          /* ── Today view ── */
          totalTasks === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <p className="text-[14px] text-text-secondary">
                {activeWorkspace
                  ? "No tasks in this workspace today."
                  : "No tasks due today."}
              </p>
              <p className="text-[13px] text-text-ghost">
                Press <kbd className="kbd">N</kbd> to create one.
              </p>
            </div>
          ) : (
            PRIORITY_ORDER.map((priority) => {
              const group = grouped[priority];
              if (group.length === 0) return null;
              return (
                <PriorityGroup
                  key={priority}
                  priority={priority}
                  tasks={group as any}
                  onComplete={handleComplete}
                  onEdit={setEditTask}
                />
              );
            })
          )
        ) : /* ── Completed view ── */
        filteredCompleted.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <CheckCircle2
              size={28}
              strokeWidth={1}
              className="text-text-ghost"
            />
            <p className="text-[14px] text-text-secondary">
              No completed tasks yet.
            </p>
            <p className="text-[13px] text-text-ghost">
              Complete a task from the Today view to see it here.
            </p>
          </div>
        ) : (
          Array.from(completedGrouped.entries()).map(
            ([dateLabel, dateTasks]) => (
              <div key={dateLabel} className="mb-4">
                {/* Date group header */}
                <div className="px-6 py-2">
                  <span className="label text-text-ghost">{dateLabel}</span>
                </div>

                {/* Tasks */}
                {dateTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-6 py-2.5 hover:bg-surface-1 transition-colors group"
                  >
                    {/* Completed checkbox */}
                    <CheckCircle2
                      size={16}
                      strokeWidth={1.5}
                      className="text-text-ghost flex-shrink-0"
                    />

                    {/* Task info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-tertiary line-through truncate">
                        {task.title}
                      </p>
                    </div>

                    {/* Workspace pill */}
                    <span className="text-[10px] text-text-ghost px-1.5 py-0.5 rounded border border-border-subtle flex-shrink-0">
                      {task.workspace.name}
                    </span>

                    {/* Priority */}
                    <span
                      className={`badge-${task.priority.toLowerCase()} px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0`}
                    >
                      {task.priority}
                    </span>

                    {/* Reopen button — visible on hover */}
                    <button
                      onClick={() => handleReopen(task.id)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] text-text-ghost opacity-0 group-hover:opacity-100 hover:text-text-primary hover:bg-surface-2 rounded transition-all"
                      title="Reopen task"
                    >
                      <RotateCcw size={11} strokeWidth={1.5} />
                      Reopen
                    </button>
                  </div>
                ))}
              </div>
            ),
          )
        )}
      </div>

      <AddTaskModal
        key={editTask?.id ?? "new"}
        open={modalOpen || !!editTask}
        onClose={() => {
          setModalOpen(false);
          setEditTask(null);
        }}
        task={editTask ?? undefined}
        defaultWorkspaceId={defaultWorkspaceForModal}
        onWorkspaceUsed={setStickyWorkspaceId}
      />
    </div>
  );
}
