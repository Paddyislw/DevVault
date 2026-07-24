"use client";

import { useState } from "react";
import { ChevronDown, GripVertical } from "lucide-react";
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
  /** When provided, rows can be drag-reordered within this group */
  onReorder?: (orderedIds: string[]) => void;
}

export function PriorityGroup({
  priority,
  tasks,
  onComplete,
  onEdit,
  onReorder,
}: PriorityGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const config = PRIORITY_CONFIG[priority];
  const doneCount = tasks.filter((t) => t.status === "DONE").length;

  const draggable = !!onReorder && tasks.length > 1;
  const fromIndex = draggedId
    ? tasks.findIndex((t) => t.id === draggedId)
    : -1;

  function resetDrag() {
    setDraggedId(null);
    setOverIndex(null);
  }

  function handleDrop() {
    if (
      draggedId === null ||
      overIndex === null ||
      fromIndex === -1 ||
      fromIndex === overIndex
    ) {
      resetDrag();
      return;
    }
    const ids = tasks.map((t) => t.id);
    ids.splice(fromIndex, 1);
    ids.splice(overIndex, 0, draggedId);
    onReorder?.(ids);
    resetDrag();
  }

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
          {tasks.map((task, index) => {
            const isDragging = draggedId === task.id;
            const isOver =
              overIndex === index && draggedId !== null && !isDragging;
            // Indicator sits where the row will land: above when moving up,
            // below when moving down
            const indicatorTop = isOver && index < fromIndex;
            const indicatorBottom = isOver && index > fromIndex;

            return (
              <div
                key={task.id}
                draggable={draggable}
                onDragStart={(e) => {
                  setDraggedId(task.id);
                  e.dataTransfer.effectAllowed = "move";
                  // Firefox requires data to be set for the drag to start
                  e.dataTransfer.setData("text/plain", task.id);
                }}
                onDragOver={(e) => {
                  if (!draggedId) return; // ignore drags from other groups
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (overIndex !== index) setOverIndex(index);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop();
                }}
                onDragEnd={resetDrag}
                // TaskRow's own divider is neutralized by its `last:` rule inside
                // this wrapper, so the wrapper carries the row divider instead
                className={`group/drag relative border-b border-border-subtle last:border-b-0 ${
                  isDragging ? "opacity-40" : ""
                }`}
              >
                {indicatorTop && (
                  <div className="pointer-events-none absolute -top-px left-0 right-0 z-10 h-[2px] rounded-full bg-accent" />
                )}
                {indicatorBottom && (
                  <div className="pointer-events-none absolute -bottom-px left-0 right-0 z-10 h-[2px] rounded-full bg-accent" />
                )}
                {draggable && (
                  <GripVertical
                    size={12}
                    strokeWidth={1.5}
                    className="pointer-events-none absolute left-[3px] top-1/2 z-10 -translate-y-1/2 text-text-ghost opacity-0 transition-opacity group-hover/drag:opacity-100"
                  />
                )}
                <TaskRow task={task} onComplete={onComplete} onEdit={onEdit} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
