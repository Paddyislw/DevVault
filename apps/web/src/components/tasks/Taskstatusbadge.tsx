"use client";

// Maps TaskStatus enum values to display config
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  BACKLOG:     { label: "Backlog",      className: "bg-surface-2 text-text-tertiary" },
  TODO:        { label: "Todo",         className: "bg-surface-2 text-text-secondary" },
  UP_NEXT:     { label: "Up Next",      className: "bg-surface-3 text-text-secondary" },
  IN_PROGRESS: { label: "In Progress",  className: "bg-[#E8F4FD] text-[#1A4F7A]" },
  BLOCKED:     { label: "Blocked",      className: "bg-[#FAD4D0] text-[#8B2215]" },
  IN_REVIEW:   { label: "In Review",    className: "bg-[#FEF0CD] text-[#7A4F00]" },
  DONE:        { label: "Done",         className: "bg-[#D4EDDA] text-[#2D6A4F]" },
  CANCELLED:   { label: "Cancelled",    className: "bg-surface-2 text-text-ghost line-through" },
};

interface TaskStatusBadgeProps {
  status: string;
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "bg-surface-2 text-text-secondary" };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide ${config.className}`}
    >
      {config.label}
    </span>
  );
}