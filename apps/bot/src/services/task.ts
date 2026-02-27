import { prisma, Task, TaskPriority, Workspace } from "@devvault/db";

type TaskWithWorkspace = Task & { workspace: { name: string } };

export type CreateTaskInput = {
  userId: string;
  title: string;
  workspaceName?: string | null;
  priority?: TaskPriority | null;
  dueDate?: string | null;
  isSomeday?: boolean;
  description?: string | null;
};

export async function createTask(
  input: CreateTaskInput,
): Promise<TaskWithWorkspace> {
  const { userId, title, workspaceName, priority, dueDate, isSomeday, description } = input;

  // Find workspace - match by name/slug or use default
  let workspace: Workspace | null = null;

  if (workspaceName) {
    workspace = await prisma.workspace.findFirst({
      where: {
        userId,
        OR: [
          { name: { equals: workspaceName, mode: "insensitive" } },
          { slug: { equals: workspaceName.toLowerCase() } },
        ],
      },
    });
  }

  // Fallback to default workspace if not found
  if (!workspace) {
    workspace = await prisma.workspace.findFirst({
      where: { userId, isDefault: true },
      orderBy: { createdAt: "asc" },
    });
  }

  if (!workspace) {
    throw new Error("No workspace found for user");
  }

  // Parse and validate due date
  let parsedDueDate: Date | null = null;
  if (dueDate) {
    const date = new Date(dueDate);
    if (!isNaN(date.getTime())) {
      parsedDueDate = date;
    }
  }

  const task = await prisma.task.create({
    data: {
      workspaceId: workspace.id,
      title,
      description: description ?? undefined,
      priority: priority ?? "P4",
      dueDate: parsedDueDate,
      isSomeday: isSomeday ?? false,
    },
    include: { workspace: { select: { name: true } } },
  });

  return task;
}

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
