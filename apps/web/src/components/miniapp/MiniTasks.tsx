"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/trpc";
import { Check, Plus } from "lucide-react";
import type { RouterOutputs } from "@/lib/trpc";

type Task = RouterOutputs["tasks"]["listToday"][number];

const PRIORITY_COLOR: Record<string, string> = {
  P1: "var(--p1-text)",
  P2: "var(--p2-text)",
  P3: "var(--p3-text)",
  P4: "var(--p4-text)",
};

function formatDueDate(dueDate: string | Date | null): string | null {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(dueDate: string | Date | null, status: string) {
  if (!dueDate || status === "DONE" || status === "CANCELLED") return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export function MiniTasks() {
  const [title, setTitle] = useState("");
  const utils = api.useUtils();

  const { data: workspaces } = api.workspaces.list.useQuery();
  const { data: tasks = [], isLoading } = api.tasks.listToday.useQuery();

  const complete = api.tasks.complete.useMutation({
    onSuccess: () => utils.tasks.listToday.invalidate(),
  });

  const create = api.tasks.create.useMutation({
    onSuccess: () => {
      setTitle("");
      utils.tasks.listToday.invalidate();
    },
  });

  function handleAdd() {
    if (!title.trim() || !workspaces?.length) return;
    const workspaceId =
      workspaces.find((w) => w.type === "PERSONAL")?.id ?? workspaces[0].id;
    create.mutate({ title: title.trim(), workspaceId });
  }

  const doneCount = tasks.filter((t) => t.status === "DONE").length;

  // Group by workspace, open tasks first within each group — done tasks sink
  // to the bottom instead of interleaving with what's still left to do.
  const groups = useMemo(() => {
    const map = new Map<string, { workspace: Task["workspace"]; tasks: Task[] }>();
    for (const task of tasks) {
      const key = task.workspace.id;
      if (!map.has(key)) map.set(key, { workspace: task.workspace, tasks: [] });
      map.get(key)!.tasks.push(task);
    }
    return Array.from(map.values())
      .sort((a, b) => a.workspace.name.localeCompare(b.workspace.name))
      .map((group) => ({
        ...group,
        tasks: [...group.tasks].sort(
          (a: Task, b: Task) =>
            Number(a.status === "DONE") - Number(b.status === "DONE"),
        ),
      }));
  }, [tasks]);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-4">
        <h1 className="font-display text-2xl text-text-primary">Today</h1>
        {tasks.length > 0 && (
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
            {doneCount}/{tasks.length}
          </span>
        )}
      </div>

      {/* Add task */}
      <div className="flex items-center gap-2 px-4 py-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add a task..."
          className="flex-1 rounded-full border border-border-default bg-surface-1 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-ghost transition-colors focus:border-accent focus:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={create.isPending || !title.trim()}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={18} strokeWidth={2} />
        </button>
      </div>

      <div className="flex flex-col gap-5 px-4 pb-6">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-2" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="text-3xl">✨</span>
            <p className="text-sm text-text-tertiary">
              Nothing due today. Enjoy your day.
            </p>
          </div>
        ) : (
          groups.map(({ workspace, tasks: groupTasks }) => (
            <div key={workspace.id} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 px-1">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: workspace.color }}
                />
                <span className="label">{workspace.name}</span>
                <span className="text-[11px] text-text-ghost">
                  {groupTasks.length}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                {groupTasks.map((task) => {
                  const done = task.status === "DONE";
                  const dueLabel = formatDueDate(task.dueDate);
                  const overdue = isOverdue(task.dueDate, task.status);

                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-1 px-3 py-2.5"
                    >
                      <button
                        onClick={() =>
                          complete.mutate({ id: task.id, completed: !done })
                        }
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                          done
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-border-strong"
                        }`}
                      >
                        {done && <Check size={12} strokeWidth={2.5} />}
                      </button>

                      {!done && (
                        <span
                          className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: PRIORITY_COLOR[task.priority] }}
                        />
                      )}

                      <span
                        className={`flex-1 truncate text-sm ${
                          done
                            ? "text-text-tertiary line-through"
                            : "text-text-primary"
                        }`}
                      >
                        {task.title}
                      </span>

                      {dueLabel && !done && (
                        <span
                          className={`flex-shrink-0 text-[11px] ${
                            overdue
                              ? "font-medium text-red-500"
                              : "text-text-tertiary"
                          }`}
                        >
                          {dueLabel}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
