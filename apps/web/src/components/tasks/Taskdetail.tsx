"use client";

import { useState } from "react";
import { Code2, Link2, FileText, Image, Trash2, Plus, X } from "lucide-react";
import { api } from "@/lib/trpc";

// Matches your Prisma TaskAttachment type
interface Attachment {
  id: string;
  type: "CODE" | "IMAGE" | "LINK" | "FILE";
  content: string | null;
  language: string | null;
  url: string | null;
  fileName: string | null;
}

interface Subtask {
  id: string;
  title: string;
  status: string;
}

interface TaskDetailProps {
  taskId: string;
  workspaceId: string;
  description: string | null;
  attachments: Attachment[];
  subtasks: Subtask[];
}

const ATTACHMENT_ICON = {
  CODE: Code2,
  LINK: Link2,
  FILE: FileText,
  IMAGE: Image,
};

export function TaskDetail({
  taskId,
  workspaceId,
  description,
  attachments,
  subtasks,
}: TaskDetailProps) {
  const hasContent =
    description || attachments.length > 0 || subtasks.length > 0;

  const [subtaskTitle, setSubtaskTitle] = useState("");

  const utils = api.useUtils();

  const deleteTask = api.tasks.delete.useMutation({
    onSuccess: () => utils.tasks.listToday.invalidate(),
  });

  const addSubtask = api.tasks.create.useMutation({
    onSuccess: () => {
      setSubtaskTitle("");
      utils.tasks.invalidate();
    },
  });

  const toggleSubtask = api.tasks.complete.useMutation({
    onSuccess: () => utils.tasks.invalidate(),
  });

  const deleteSubtask = api.tasks.delete.useMutation({
    onSuccess: () => utils.tasks.invalidate(),
  });

  function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault();
    const title = subtaskTitle.trim();
    if (!title || addSubtask.isPending) return;
    addSubtask.mutate({ title, workspaceId, parentTaskId: taskId });
  }

  return (
    <div className="border-t border-border-subtle bg-surface-0 px-[52px] py-3">
      {!hasContent && (
        <p className="text-[13px] text-text-ghost italic">No description.</p>
      )}

      {/* Description */}
      {description && (
        <p className="text-[13px] leading-relaxed text-text-secondary">
          {description}
        </p>
      )}

      {/* Subtasks */}
      <div className="mt-3">
        <p className="label mb-1.5">Subtasks</p>
        {subtasks.length > 0 && (
          <div className="space-y-1 mb-1.5">
            {subtasks.map((sub) => (
              <div
                key={sub.id}
                className="group/subtask flex items-center gap-2 text-[13px] text-text-secondary"
              >
                <button
                  type="button"
                  onClick={() =>
                    toggleSubtask.mutate({
                      id: sub.id,
                      completed: sub.status !== "DONE",
                    })
                  }
                  className={`h-3.5 w-3.5 shrink-0 rounded-sm border transition-colors ${
                    sub.status === "DONE"
                      ? "border-[#2D6A4F] bg-[#D4EDDA]"
                      : "border-border-default bg-transparent"
                  }`}
                />
                <span
                  className={`flex-1 truncate ${
                    sub.status === "DONE" ? "line-through text-text-ghost" : ""
                  }`}
                >
                  {sub.title}
                </span>
                <button
                  type="button"
                  onClick={() => deleteSubtask.mutate({ id: sub.id })}
                  className="shrink-0 text-text-ghost opacity-0 transition-opacity hover:text-red-500 group-hover/subtask:opacity-100"
                >
                  <X size={12} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}
        <form
          onSubmit={handleAddSubtask}
          className="flex items-center gap-2 text-[13px]"
        >
          <Plus
            size={12}
            strokeWidth={1.5}
            className="shrink-0 text-text-ghost"
          />
          <input
            type="text"
            value={subtaskTitle}
            onChange={(e) => setSubtaskTitle(e.target.value)}
            placeholder="Add subtask..."
            disabled={addSubtask.isPending}
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-ghost outline-none disabled:opacity-40"
          />
        </form>
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="mt-3">
          <p className="label mb-1.5">Attachments</p>
          <div className="flex flex-wrap gap-2">
            {attachments.map((att) => {
              const Icon = ATTACHMENT_ICON[att.type] ?? FileText;
              return (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 rounded-md border border-border-default bg-surface-1 px-2.5 py-1.5 text-[12px] text-text-secondary"
                >
                  <Icon
                    size={12}
                    strokeWidth={1.5}
                    className="text-text-tertiary"
                  />
                  <span>
                    {att.fileName ?? att.url ?? att.language ?? att.type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-border-subtle mt-2">
        <button
          onClick={() => {
            if (confirm("Delete this task?")) deleteTask.mutate({ id: taskId });
          }}
          disabled={deleteTask.isPending}
          className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-red-500 transition-colors disabled:opacity-40"
        >
          <Trash2 size={13} strokeWidth={1.5} className="text-red-500"/>
          {deleteTask.isPending ? "Deleting..." : "Delete task"}
        </button>
      </div>
    </div>
  );
}
