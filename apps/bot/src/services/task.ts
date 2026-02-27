import { prisma, Task, TaskPriority } from "@devvault/db";

type TaskWithWorkspace = Task & { workspace: { name: string } };

export async function getTodayTasks(
  userId: string,
): Promise<TaskWithWorkspace[]> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  return prisma.task.findMany({
    where: {
      workspace: { userId },
      isSomeday: false,
      isBacklog: false,
      OR: [
        // Overdue + incomplete — always show
        {
          dueDate: { lt: startOfToday },
          status: { notIn: ["DONE", "CANCELLED"] },
        },
        // Today's tasks — show regardless of status
        {
          dueDate: { gte: startOfToday, lte: endOfToday },
        },
        // No due date + incomplete — show
        {
          dueDate: null,
          status: { notIn: ["DONE", "CANCELLED"] },
        },
      ],
    },
    include: { workspace: { select: { name: true } } },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
}

export async function getSomedayTasks(
  userId: string,
): Promise<TaskWithWorkspace[]> {
  return prisma.task.findMany({
    where: {
      workspace: { userId },
      status: { notIn: ["DONE", "CANCELLED"] },
      isSomeday: true,
    },
    include: { workspace: { select: { name: true } } },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
}

export async function getBacklogTasks(
  userId: string,
): Promise<TaskWithWorkspace[]> {
  return prisma.task.findMany({
    where: {
      workspace: { userId },
      status: { notIn: ["DONE", "CANCELLED"] },
      isBacklog: true,
    },
    include: { workspace: { select: { name: true } } },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
}

const PRIORITY_EMOJI: Record<TaskPriority, string> = {
  P1: "🔴",
  P2: "🟠",
  P3: "🔵",
  P4: "⚪",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  P1: "P1 Critical",
  P2: "P2 High",
  P3: "P3 Medium",
  P4: "P4 Low",
};

export function formatTasksByPriority(
  tasks: TaskWithWorkspace[],
  title: string,
  emptyMessage: string,
  footerHint?: string,
): string {
  if (tasks.length === 0) {
    return `${title}\n\n${emptyMessage}`;
  }

  const grouped = tasks.reduce(
    (acc, task) => {
      if (!acc[task.priority]) acc[task.priority] = [];
      acc[task.priority].push(task);
      return acc;
    },
    {} as Record<TaskPriority, TaskWithWorkspace[]>,
  );

  const priorities: TaskPriority[] = ["P1", "P2", "P3", "P4"];
  const sections: string[] = [title, ""];

  const presentPriorities = priorities.filter(
    (p) => grouped[p] && grouped[p].length > 0,
  );
  const absentPriorities = priorities.filter(
    (p) => !grouped[p] || grouped[p].length === 0,
  );

  for (const priority of presentPriorities) {
    const emoji = PRIORITY_EMOJI[priority];
    const label = PRIORITY_LABELS[priority];
    sections.push(`${emoji} ${label}`);

    for (const task of grouped[priority]) {
      sections.push(`• ${task.title}`);
    }
    sections.push("");
  }

  if (absentPriorities.length > 0) {
    const absentLabels = absentPriorities.map((p) => p).join("/");
    sections.push(`No ${absentLabels} tasks.`);
  }

  if (footerHint) {
    sections.push("", footerHint);
  }

  return sections.join("\n");
}
