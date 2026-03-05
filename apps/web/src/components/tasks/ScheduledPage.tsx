"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/trpc";
import type { RouterOutputs } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { TaskRow } from "./Taskrow";
import { AddTaskModal } from "./AddTaskModal";
import { EmptyState } from "@/components/shared/empty-state";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";

type Task = RouterOutputs["tasks"]["listScheduled"][number];

function groupByDate(tasks: Task[]): Record<string, Task[]> {
  const groups: Record<string, Task[]> = {};
  for (const task of tasks) {
    const key = task.dueDate
      ? new Date(task.dueDate).toDateString()
      : "No Date";
    if (!groups[key]) groups[key] = [];
    groups[key].push(task);
  }
  return groups;
}

function formatDateLabel(dateStr: string): string {
  if (dateStr === "No Date") return "No Date";
  const d = new Date(dateStr);
  const diff = Math.round((d.getTime() - Date.now()) / 86400000);
  if (diff <= 1) return "Tomorrow";
  if (diff < 7)
    return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ScheduledPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const {
    data: tasks = [],
    isLoading,
    refetch,
  } = api.tasks.listScheduled.useQuery({});

  const queryClient = useQueryClient();
  const queryKey = getQueryKey(api.tasks.listScheduled, {}, "query");

  const completeMutation = api.tasks.complete.useMutation({
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: Task[] | undefined) =>
        (old ?? []).map((t) =>
          t.id === id ? { ...t, status: completed ? "DONE" : "TODO" } : t,
        ),
      );
      return { previous };
    },
    onError: (_err, _input, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => refetch(),
  });

  const handleComplete = (id: string, completed: boolean) => {
    completeMutation.mutate({ id, completed });
  };

  useGlobalShortcuts({ n: () => setModalOpen(true) });

  const grouped = useMemo(() => groupByDate(tasks), [tasks]);
  const dateKeys = Object.keys(grouped);

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
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-[32px] leading-none text-text-primary">
              Scheduled
            </h1>
            <p className="text-[12px] text-text-tertiary tracking-wide">
              {tasks.length} upcoming task{tasks.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-3 py-1.5 text-sm bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity"
        >
          + New Task
        </button>
      </div>

      {/* ── Task groups by date ── */}
      <div className="flex-1 overflow-y-auto py-3">
        {dateKeys.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              message="No scheduled tasks."
              shortcut="N"
              actionHint="to create one with a future due date."
            />
          </div>
        ) : (
          <div className="space-y-4">
            {dateKeys.map((dateKey) => (
              <div key={dateKey}>
                <p className="label text-text-tertiary mb-1 px-6">
                  {formatDateLabel(dateKey)}
                </p>
                <div>
                  {grouped[dateKey].map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onComplete={handleComplete}
                      onEdit={setEditTask}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
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
