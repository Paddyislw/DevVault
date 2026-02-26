"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { TaskRow } from "./Taskrow";
import type { RouterOutputs } from "@/lib/trpc";

type Task = RouterOutputs["tasks"]["list"][number];

const PRIORITY_CONFIG = {
  P1: { label: "P1 · Critical", badgeClass: "badge-p1" },
  P2: { label: "P2 · High", badgeClass: "badge-p2" },
  P3: { label: "P3 · Medium", badgeClass: "badge-p3" },
  P4: { label: "P4 · Low", badgeClass: "badge-p4" },
} as const;

interface PriorityGroupProps {
  priority: keyof typeof PRIORITY_CONFIG;
  tasks: Task[];
  onComplete: (id: string, completed: boolean) => void;
  onEdit: (task: Task) => void;
}

export function PriorityGroup({
  priority,
  tasks,
  onComplete,
  onEdit,
}: PriorityGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const config = PRIORITY_CONFIG[priority];
  const doneCount = tasks.filter((t) => t.status === "DONE").length;

  return (
    <div className="mb-1">
      {/* ── Section header — editorial style ── */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="section-header w-full cursor-pointer border-none bg-transparent px-4 py-2 text-left hover:text-text-primary"
      >
        {/* Priority badge */}
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${config.badgeClass}`}
        >
          {config.label}
        </span>

        {/* Count */}
        <span className="text-[11px] text-text-tertiary">
          {doneCount}/{tasks.length}
        </span>

        {/* Chevron */}
        <ChevronDown
          size={12}
          strokeWidth={2}
          className={`ml-auto mr-0 shrink-0 text-text-ghost transition-transform duration-150 ${
            collapsed ? "-rotate-90" : ""
          }`}
          style={{ flex: "none" }} // prevent section-header::after from affecting it
        />
      </button>

      {/* ── Task rows ── */}
      {!collapsed && (
        <div className="rounded-md border border-border-default bg-surface-1 card-hover mx-4 mb-2">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onComplete={onComplete}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
