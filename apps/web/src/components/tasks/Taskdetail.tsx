"use client";

import { Code2, Link2, FileText, Image, Trash2 } from "lucide-react";
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
  description,
  attachments,
  subtasks,
}: TaskDetailProps) {
  const hasContent =
    description || attachments.length > 0 || subtasks.length > 0;

  const utils = api.useUtils();

  const deleteTask = api.tasks.delete.useMutation({
    onSuccess: () => utils.tasks.list.invalidate(),
  });

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
      {subtasks.length > 0 && (
        <div className="mt-3">
          <p className="label mb-1.5">Subtasks</p>
          <div className="space-y-1">
            {subtasks.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center gap-2 text-[13px] text-text-secondary"
              >
                <div
                  className={`h-3.5 w-3.5 rounded-sm border ${
                    sub.status === "DONE"
                      ? "border-[#2D6A4F] bg-[#D4EDDA]"
                      : "border-border-default bg-transparent"
                  }`}
                />
                <span
                  className={
                    sub.status === "DONE" ? "line-through text-text-ghost" : ""
                  }
                >
                  {sub.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
