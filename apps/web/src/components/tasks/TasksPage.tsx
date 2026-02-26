"use client";

import { useMemo } from "react";
import { PriorityGroup } from "./PriorityGroup";
import { api } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { useState, useEffect } from "react";
import { AddTaskModal } from "./AddTaskModal";
import type { RouterOutputs } from "@/lib/trpc";

type Task = RouterOutputs["tasks"]["list"][number];

const PRIORITY_ORDER = ["P1", "P2", "P3", "P4"] as const;

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return {
    dueAfter: start.toISOString(),
    dueBefore: end.toISOString(),
  };
}

function formatTodayHeading() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function TasksPage() {
  const { dueAfter, dueBefore } = getTodayRange();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const { data: incompleteTasksByPriority } =
    api.tasks.numberOfIncompleteTasks.useQuery();

  console.log("incompleteTasksByPriority:", incompleteTasksByPriority);

  const filteredIncompleteTaskWithNonZeroCount =
    incompleteTasksByPriority?.filter((task) => task._count.id > 0);

  const {
    data: tasks = [],
    isLoading,
    refetch,
  } = api.tasks.list.useQuery({
    dueAfter,
    dueBefore,
  });

  const queryClient = useQueryClient();
  const queryKey = getQueryKey(
    api.tasks.list,
    { dueAfter, dueBefore },
    "query",
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
    onError: (err, newTask, context) => {
      queryClient.setQueryData(queryKey, context?.previousTasks);
    },
    onSettled: () => refetch(),
  });

  const handleComplete = (id: string, completed: boolean) => {
    completeMutation.mutate({ id, completed });
  };

  // Group tasks by priority
  const grouped = useMemo(() => {
    const groups: Record<string, typeof tasks> = {
      P1: [],
      P2: [],
      P3: [],
      P4: [],
    };
    for (const task of tasks) {
      if (groups[task.priority]) {
        groups[task.priority].push(task);
      }
    }
    return groups;
  }, [tasks]);

  const incompleteCounts = useMemo(() => {
    return tasks.reduce(
      (acc, task) => {
        if (task.status !== "DONE") {
          acc[task.priority] = (acc[task.priority] ?? 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [tasks]);

  // N key shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "n" && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        setModalOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "DONE").length;

  console.log("tasks:", tasks, "isLoading:", isLoading);

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
          {/* Stats bar — sits naturally under the date */}
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
      {/* ── Task groups ── */}
      <div className="flex-1 overflow-y-auto py-3">
        {totalTasks === 0 ? (
          /* ── Empty state — text only, one clear action ── */
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <p className="text-[14px] text-text-secondary">
              No tasks due today.
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
      />
    </div>
  );
}
