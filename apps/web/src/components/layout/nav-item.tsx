"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  collapsed: boolean;
  badge?: number;
}

export function NavItem({ href, label, icon: Icon, collapsed, badge }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  const content = (
    <Link
      href={href}
      className={`group relative flex items-center gap-3 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-colors duration-150 ${
        isActive
          ? "bg-surface-2 text-text-primary"
          : "text-text-secondary hover:bg-surface-2/50 hover:text-text-primary"
      }`}
    >
      <Icon
        size={16}
        strokeWidth={1.5}
        className={isActive ? "text-accent" : ""}
      />
      {!collapsed && (
        <>
          <span>{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="ml-auto text-[11px] tabular-nums text-text-tertiary">
              {badge}
            </span>
          )}
        </>
      )}
      {collapsed && badge !== undefined && badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-semibold text-accent-foreground">
          {badge}
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">
          {label}
          {badge !== undefined && badge > 0 && (
            <span className="ml-1.5 text-text-tertiary">({badge})</span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
