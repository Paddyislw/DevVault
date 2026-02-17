"use client";

import { Search } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CommandTriggerProps {
  collapsed: boolean;
}

export function CommandTrigger({ collapsed }: CommandTriggerProps) {
  const content = (
    <button
      className="flex w-full items-center gap-3 rounded-md border border-border-default bg-surface-1 px-2.5 py-[7px] text-[13px] text-text-ghost transition-colors duration-150 hover:border-surface-3 hover:text-text-secondary"
    >
      <Search size={16} strokeWidth={1.5} />
      {!collapsed && (
        <>
          <span>Search...</span>
          <kbd className="kbd ml-auto">⌘K</kbd>
        </>
      )}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">
          Search <kbd className="kbd ml-1">⌘K</kbd>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
