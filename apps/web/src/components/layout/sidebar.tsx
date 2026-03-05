"use client";

import { useState } from "react";
import {
  CalendarDays,
  Calendar,
  Inbox,
  Lightbulb,
  CloudSun,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Code2,
  Activity,
  FileText,
} from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { NavItem } from "./nav-item";
import { WorkspaceItem } from "./workspace-item";
import { SectionLabel } from "./section-label";
import { CommandTrigger } from "./command-trigger";
import { api } from "@/lib/trpc";

const NAV_ITEMS = [
  { label: "Today", href: "/", icon: CalendarDays },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Scheduled", href: "/scheduled", icon: Calendar },
  { label: "Someday", href: "/someday", icon: CloudSun },
  { label: "Ideas", href: "/ideas", icon: Lightbulb },
  { label: "Snippets", href: "/snippets", icon: Code2 },
  { label: "Notes", href: "/notes", icon: FileText },
  { label: "Activity", href: "/activity", icon: Activity },
] as const;

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { data: workspaces = [] } = api.workspaces.list.useQuery();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={`flex h-screen flex-col border-r border-border-default bg-surface-1 transition-[width] duration-150 ${
          collapsed ? "w-[52px]" : "w-[220px]"
        }`}
      >
        {/* ── Brand ── */}
        <div className="flex h-[52px] items-center gap-2.5 px-3">
          {/* Logo mark */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border-default bg-surface-0">
            <div className="h-2 w-2 rounded-full bg-accent" />
          </div>
          {!collapsed && (
            <span className="font-display text-[13px] tracking-widest text-text-primary">
              DevVault
            </span>
          )}
        </div>

      

        {/* ── Navigation ── */}
        <nav className="flex-1 space-y-0.5 p-2">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              collapsed={collapsed}
            />
          ))}
        </nav>

        <div className="px-2 pb-2">
          <CommandTrigger collapsed={collapsed} />
        </div>

        <Separator className="bg-border-subtle" />

        {/* ── Workspaces ── */}
        <div className="p-2">
          <SectionLabel collapsed={collapsed}>Workspaces</SectionLabel>
          <div className="space-y-0.5">
            {workspaces.map((ws) => (
              <WorkspaceItem
                key={ws.id}
                name={ws.name}
                color={ws.color ?? "#3b82f6"}
                collapsed={collapsed}
              />
            ))}
          </div>
        </div>

        <Separator className="bg-border-subtle" />

        {/* ── Bottom ── */}
        <div className="space-y-0.5 p-2">
          <NavItem
            href="/settings"
            label="Settings"
            icon={Settings}
            collapsed={collapsed}
          />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center gap-3 rounded-md px-2.5 py-[7px] text-[13px] text-text-ghost transition-colors duration-150 hover:bg-surface-2 hover:text-text-secondary"
          >
            {collapsed ? (
              <PanelLeft size={16} strokeWidth={1.5} />
            ) : (
              <>
                <PanelLeftClose size={16} strokeWidth={1.5} />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}