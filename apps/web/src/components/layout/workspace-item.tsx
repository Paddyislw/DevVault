"use client";

import { User, Briefcase } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const LUCIDE_ICON_MAP: Record<string, React.ReactNode> = {
  user: <User size={12} strokeWidth={1.5} />,
  briefcase: <Briefcase size={12} strokeWidth={1.5} />,
};

function renderWorkspaceIcon(icon: string | null) {
  if (!icon) return <User size={12} strokeWidth={1.5} />;
  if (LUCIDE_ICON_MAP[icon]) return LUCIDE_ICON_MAP[icon];
  return <span className="text-xs leading-none">{icon}</span>;
}

interface WorkspaceItemProps {
  name: string;
  color: string;
  icon?: string | null;
  isActive?: boolean;
  collapsed: boolean;
  onClick?: () => void;
}

export function WorkspaceItem({
  name,
  color,
  icon = null,
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
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded"
        style={{ color }}
      >
        {renderWorkspaceIcon(icon)}
      </span>
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
