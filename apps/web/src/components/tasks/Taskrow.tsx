"use client";

import { useState } from "react";
import { ChevronRight, AlertCircle } from "lucide-react";
import { TaskStatusBadge } from "./Taskstatusbadge";
import { TaskDetail } from "./Taskdetail";


interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  isBacklog: boolean;
  isSomeday: boolean;
  workspace: { id: string; name: string; color: string };
  attachments: Array<{
    id: string;
    type: "CODE" | "IMAGE" | "LINK" | "FILE";
    content: string | null;
    language: string | null;
    url: string | null;
    fileName: string | null;
  }>;
  subtasks: Array<{ id: string; title: string; status: string }>;
}

interface TaskRowProps {
  task: Task;
  onComplete: (id: string, completed: boolean) => void;
}

function isOverdue(dueDate: Date | null, status: string): boolean {
  if (!dueDate || status === "DONE" || status === "CANCELLED") return false;
  return new Date(dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
}

function formatDueDate(dueDate: Date | null): string {
  if (!dueDate) return "";
  const d = new Date(dueDate);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TaskRow({ task, onComplete }: TaskRowProps) {
  const [expanded, setExpanded] = useState(false);
  const isDone = task.status === "DONE";
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <div className="group border-b border-border-subtle last:border-b-0">
      {/* ── Main row ── */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-100 hover:bg-surface-2 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete(task.id, !isDone);
          }}
          className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm border transition-colors duration-100"
          style={{
            borderColor: isDone ? "var(--success)" : "var(--border-strong)",
            backgroundColor: isDone ? "var(--success-bg)" : "transparent",
          }}
        >
          {isDone && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2.5 2.5L8 3" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Title */}
        <span
          className={`flex-1 truncate text-[13px] ${
            isDone
              ? "text-text-ghost line-through"
              : "text-text-primary"
          }`}
        >
          {task.title}
        </span>

        {/* Subtask count */}
        {task.subtasks.length > 0 && (
          <span className="text-[11px] text-text-tertiary">
            {task.subtasks.filter((s) => s.status === "DONE").length}/{task.subtasks.length}
          </span>
        )}

        {/* Workspace pill */}
        <span
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border-subtle px-2 py-0.5 text-[11px] text-text-tertiary sm:flex"
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: task.workspace.color }}
          />
          {task.workspace.name}
        </span>

        {/* Due date */}
        {task.dueDate && (
          <span
            className={`flex shrink-0 items-center gap-1 text-[12px] ${
              overdue ? "text-[var(--danger)]" : "text-text-tertiary"
            }`}
          >
            {overdue && <AlertCircle size={11} strokeWidth={2} />}
            {formatDueDate(task.dueDate)}
          </span>
        )}

        {/* Status badge */}
        <TaskStatusBadge status={task.status} />

        {/* Expand chevron */}
        <ChevronRight
          size={14}
          strokeWidth={1.5}
          className={`shrink-0 text-text-ghost transition-transform duration-150 ${
            expanded ? "rotate-90" : ""
          }`}
        />
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <TaskDetail
          description={task.description}
          attachments={task.attachments}
          subtasks={task.subtasks}
        />
      )}
    </div>
  );
}