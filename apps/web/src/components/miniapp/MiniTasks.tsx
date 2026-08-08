"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { Check } from "lucide-react";

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

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add a task"
          className="flex-1 rounded-md border border-border-default bg-surface-1 px-3 py-2 text-sm text-text-primary placeholder:text-text-ghost focus:border-border-strong focus:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={create.isPending || !title.trim()}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-11 animate-pulse rounded-md bg-surface-2" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-tertiary">
          Nothing due today.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {tasks.map((task) => {
            const done = task.status === "DONE";
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-md border border-border-subtle bg-surface-1 px-3 py-2.5"
              >
                <button
                  onClick={() => complete.mutate({ id: task.id, completed: !done })}
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                    done
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border-strong"
                  }`}
                >
                  {done && <Check size={12} strokeWidth={2.5} />}
                </button>
                <span
                  className={`flex-1 text-sm ${
                    done ? "text-text-tertiary line-through" : "text-text-primary"
                  }`}
                >
                  {task.title}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
