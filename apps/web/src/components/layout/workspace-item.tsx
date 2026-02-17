"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WorkspaceItemProps {
  name: string;
  color: string;
  isActive?: boolean;
  collapsed: boolean;
  onClick?: () => void;
}

export function WorkspaceItem({
  name,
  color,
  isActive = false,
  collapsed,
  onClick,
}: WorkspaceItemProps) {
  const content = (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md px-2.5 py-[7px] text-[13px] transition-colors duration-150 ${
        isActive
          ? "bg-surface-2 text-text-primary"
          : "text-text-secondary hover:bg-surface-2/50 hover:text-text-primary"
      }`}
    >
      <span
        className="h-[9px] w-[9px] shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      {!collapsed && <span className="truncate">{name}</span>}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">
          {name}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
