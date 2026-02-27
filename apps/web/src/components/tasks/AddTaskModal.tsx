// components/tasks/AddTaskModal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { TaskPriority } from "@devvault/db";
import { api } from "@/lib/trpc";
import { PriorityPicker } from "./PriorityPicker";
import { WorkspacePicker } from "./WorkspacePicker";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { RouterOutputs } from "@/lib/trpc";

type Task = RouterOutputs["tasks"]["list"][number];

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  task?: Task;
  defaultSomeday?: boolean;
  defaultBacklog?: boolean;
}

interface FormState {
  title: string;
  workspaceId: string;
  priority: TaskPriority | null;
  dueDate: string;
  description: string;
  isSomeday: boolean;
  isBacklog: boolean;
}

const today = new Date().toISOString().split("T")[0];

const EMPTY_FORM: FormState = {
  title: "",
  workspaceId: "",
  priority: null,
  dueDate: today,
  description: "",
  isSomeday: false,
  isBacklog: false,
};

function getInitialForm(
  task?: Task,
  defaultSomeday?: boolean,
  defaultBacklog?: boolean,
): FormState {
  if (task) {
    return {
      title: task.title,
      workspaceId: task.workspace.id,
      priority: task.priority,
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : today,
      description: task.description ?? "",
      isSomeday: task.isSomeday,
      isBacklog: task.isBacklog,
    };
  }
  return {
    ...EMPTY_FORM,
    isSomeday: defaultSomeday ?? false,
    isBacklog: defaultBacklog ?? false,
    dueDate: defaultSomeday ? "" : today,
  };
}

export function AddTaskModal({
  open,
  onClose,
  task,
  defaultSomeday,
  defaultBacklog,
}: AddTaskModalProps) {
  // With key={task?.id} on the component, we get fresh state on each task
  const [form, setForm] = useState<FormState>(() =>
    getInitialForm(task, defaultSomeday, defaultBacklog),
  );
  const titleRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  // Pre-select default workspace for create mode
  const { data: workspaces } = api.workspaces.list.useQuery();

  // Set default workspace for CREATE mode only
  useEffect(() => {
    if (task || form.workspaceId) return;
    if (!workspaces?.length) return;
    const def = workspaces.find((w) => w.isDefault) ?? workspaces[0];
    if (def) setForm((f) => ({ ...f, workspaceId: def.id }));
  }, [task, workspaces, form.workspaceId]);

  // Reset form when modal opens for a new task (not editing)
  useEffect(() => {
    if (open && !task) {
      setForm(getInitialForm(undefined, defaultSomeday, defaultBacklog));
    }
  }, [open, task, defaultSomeday, defaultBacklog]);

  // Focus title on open
  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const createTask = api.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      onClose();
    },
  });

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleSomeday(checked: boolean) {
    setForm((f) => ({
      ...f,
      isSomeday: checked,
      dueDate: checked ? "" : f.dueDate,
    }));
  }

  const updateTask = api.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.workspaceId) return;
    // Prevent double submission
    if (createTask.isPending || updateTask.isPending) return;

    const payload = {
      title: form.title.trim(),
      workspaceId: form.workspaceId,
      priority: form.priority ?? undefined,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      description: form.description || undefined,
      isSomeday: form.isSomeday,
      isBacklog: form.isBacklog,
    };

    if (task) {
      updateTask.mutate({ id: task.id, ...payload });
    } else {
      createTask.mutate(payload);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-surface-1 border border-border-default rounded-lg w-full max-w-lg shadow-lg pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <h2 className="font-display font-light text-base  text-text-primary">
              {task ? "Edit Task" : "New Task"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            {/* Title */}
            <input
              ref={titleRef}
              type="text"
              placeholder="Task title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="w-full bg-transparent text-text-primary placeholder:text-text-tertiary text-sm outline-none border-b border-border-subtle pb-2 focus:border-border-strong transition-colors"
            />

            {/* Workspace */}
            <div className="flex flex-col gap-1.5">
              <span className="label text-text-secondary">Workspace</span>
              <WorkspacePicker
                value={form.workspaceId}
                onChange={(v) => set("workspaceId", v)}
              />
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-1.5">
              <span className="label text-text-secondary">Priority</span>
              <PriorityPicker
                value={form.priority}
                onChange={(v) => set("priority", v)}
              />
            </div>

            {/* Due date + Someday row */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1.5 flex-1">
                <span className="label text-text-secondary">Due date</span>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => set("dueDate", e.target.value)}
                  disabled={form.isSomeday}
                  className="text-sm bg-surface-0 border border-border-default rounded px-2 py-1.5 text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <Switch
                  id="someday"
                  checked={form.isSomeday}
                  onCheckedChange={handleSomeday}
                />
                <Label
                  htmlFor="someday"
                  className="text-sm text-text-secondary cursor-pointer"
                >
                  Someday
                </Label>
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <span className="label text-text-secondary">Description</span>
              <textarea
                placeholder="Add details..."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                className="w-full bg-surface-0 border border-border-default rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:border-border-strong transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-text-tertiary">
                <span className="kbd">Esc</span> to cancel
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    !form.title.trim() ||
                    !form.workspaceId ||
                    createTask.isPending ||
                    updateTask.isPending
                  }
                  className="px-4 py-1.5 text-sm bg-accent text-white rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  {task
                    ? updateTask.isPending
                      ? "Saving..."
                      : "Save changes"
                    : createTask.isPending
                      ? "Creating..."
                      : "Create task"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
