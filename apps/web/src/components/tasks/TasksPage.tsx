"use client";

import { useMemo, useState } from "react";
import { PriorityGroup } from "./PriorityGroup";
import { api } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { AddTaskModal } from "./AddTaskModal";
import type { RouterOutputs } from "@/lib/trpc";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";

type Task = RouterOutputs["tasks"]["list"][number];

const PRIORITY_ORDER = ["P1", "P2", "P3", "P4"] as const;

function formatTodayHeading() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function TasksPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<string | null>(null);

  // Sticky workspace: remembers last used workspace for new task creation
  const [stickyWorkspaceId, setStickyWorkspaceId] = useState<string | null>(
    null,
  );

  const { data: workspaces = [] } = api.workspaces.list.useQuery();

  const {
    data: tasks = [],
    isLoading,
    refetch,
  } = api.tasks.listToday.useQuery();

  const queryClient = useQueryClient();
  const queryKey = getQueryKey(api.tasks.listToday, undefined, "query");

  // Filter tasks by workspace
  const filteredTasks = useMemo(
    () =>
      activeWorkspace
        ? tasks.filter((t) => t.workspace.id === activeWorkspace)
        : tasks,
    [tasks, activeWorkspace],
  );

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
    onSettled: () => refetch(),
  });

  const handleComplete = (id: string, completed: boolean) => {
    completeMutation.mutate({ id, completed });
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

  // Count tasks per workspace (from all tasks, not filtered)
  const workspaceCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of tasks) {
      c[t.workspace.id] = (c[t.workspace.id] ?? 0) + 1;
    }
    return c;
  }, [tasks]);

  // Resolve which workspace to pre-select in the modal
  const defaultWorkspaceForModal =
    stickyWorkspaceId ?? activeWorkspace ?? undefined;

  // ── Loading ──
  if (isLoading) {
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
        {/* Left: title + date + stats */}
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-[32px] leading-none text-text-primary">
              Today
            </h1>
            <p className="text-[12px] text-text-tertiary tracking-wide">
              {formatTodayHeading()}
            </p>
          </div>
          {/* Stats bar */}
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
        </div>

        {/* Right: progress + button */}
        <div className="flex items-center gap-4">
          {totalTasks > 0 && (
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
          <button
            onClick={() => setModalOpen(true)}
            className="px-3 py-1.5 text-sm bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity"
          >
            + New Task
          </button>
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
              {tasks.length}
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

      {/* ── Task groups ── */}
      <div className="flex-1 overflow-y-auto py-3">
        {totalTasks === 0 ? (
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
