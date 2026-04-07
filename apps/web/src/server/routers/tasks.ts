// apps/web/src/server/routers/tasks.ts
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  TaskPriority,
  TaskStatus,
  PrismaClient,
  Prisma,
} from "@devvault/db";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function logActivity(
  prisma: PrismaClient,
  userId: string,
  action: string,
  entityId: string,
  metadata?: Record<string, string | number | boolean | null>,
) {
  await prisma.activityLog.create({
    data: {
      userId,
      action,
      entityType: "task",
      entityId,
      metadata: (metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

// ─── Input Schemas ────────────────────────────────────────────────────────────

const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  workspaceId: z.string(),
  priority: z.nativeEnum(TaskPriority).default("P3"),
  status: z.nativeEnum(TaskStatus).default("TODO"),
  dueDate: z.string().datetime().optional().nullable(),
  isBacklog: z.boolean().default(false),
  isSomeday: z.boolean().default(false),
  parentTaskId: z.string().optional().nullable(),
});

const updateTaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional().nullable(),
  workspaceId: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  isBacklog: z.boolean().optional(),
  isSomeday: z.boolean().optional(),
  position: z.number().optional(),
});

const listTasksSchema = z.object({
  workspaceId: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  isBacklog: z.boolean().optional(),
  isSomeday: z.boolean().optional(),
  dueBefore: z.string().datetime().optional(), // for "today" view: dueDate <= today
  dueAfter: z.string().datetime().optional(),
  parentTaskId: z.string().nullable().optional(),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const tasksRouter = router({
  // CREATE
  create: protectedProcedure
    .input(createTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const { session, prisma } = ctx;

      // Verify workspace belongs to this user
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: input.workspaceId,
          userId: session.user.id,
        },
      });

      if (!workspace) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Workspace not found or access denied",
        });
      }

      // Get highest position in this workspace for ordering
      const lastTask = await prisma.task.findFirst({
        where: { workspaceId: input.workspaceId },
        orderBy: { position: "desc" },
        select: { position: true },
      });

      const task = await prisma.task.create({
        data: {
          ...input,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          position: (lastTask?.position ?? 0) + 1000, // sparse positioning
        },
      });

      await logActivity(prisma, session.user.id, "task.created", task.id, {
        title: task.title,
        workspace: workspace.name,
        workspaceColor: workspace.color,
      });

      return task;
    }),

  // LIST (with filters)
  list: protectedProcedure
    .input(listTasksSchema)
    .query(async ({ ctx, input }) => {
      const { session, prisma } = ctx;

      // Build where clause dynamically
      const where: Record<string, unknown> = {
        workspace: { userId: session.user.id }, // security: only own tasks
      };

      if (input.workspaceId) where.workspaceId = input.workspaceId;
      if (input.status !== undefined) where.status = input.status;
      if (input.priority !== undefined) where.priority = input.priority;
      if (input.isBacklog !== undefined) where.isBacklog = input.isBacklog;
      if (input.isSomeday !== undefined) where.isSomeday = input.isSomeday;
      if (input.parentTaskId !== undefined)
        where.parentTaskId = input.parentTaskId;

      // Date range filtering
      if (input.dueBefore || input.dueAfter) {
        where.dueDate = {
          ...(input.dueAfter && { gte: new Date(input.dueAfter) }),
          ...(input.dueBefore && { lte: new Date(input.dueBefore) }),
        };
      }

      const tasks = await prisma.task.findMany({
        where,
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
        include: {
          attachments: true,
          subtasks: {
            select: { id: true, title: true, status: true },
          },
          workspace: { select: { id: true, name: true, color: true } },
        },
      });

      return tasks;
    }),

  listToday: protectedProcedure.query(async ({ ctx }) => {
    const startOfToday = new Date();
   // startOfToday.setDate(startOfToday.getDate() - 1);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    return ctx.prisma.task.findMany({
      where: {
        workspace: { userId: ctx.session.user.id },
        isSomeday: false,
        isBacklog: false,
        OR: [
          // Overdue + incomplete
          {
            dueDate: { lt: startOfToday },
            status: { notIn: ["DONE", "CANCELLED"] },
          },
          // Today — all statuses
          {
            dueDate: { gte: startOfToday, lte: endOfToday },
          },
          // No due date + incomplete
          {
            dueDate: null,
            status: { notIn: ["DONE", "CANCELLED"] },
          },
        ],
      },
      include: {
        attachments: true,
        subtasks: true,
        workspace: { select: { id: true, name: true, color: true } },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
  }),

  // LIST SCHEDULED (future due dates only)
  listScheduled: protectedProcedure
    .input(z.object({ workspaceId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const startOfTomorrow = new Date();
      startOfTomorrow.setHours(24, 0, 0, 0);

      return ctx.prisma.task.findMany({
        where: {
          workspace: { userId: ctx.session.user.id },
          ...(input.workspaceId && { workspaceId: input.workspaceId }),
          status: { notIn: ["DONE", "CANCELLED"] },
          dueDate: { gte: startOfTomorrow },
          isSomeday: false,
        },
        include: {
          attachments: true,
          subtasks: {
            select: { id: true, title: true, status: true },
          },
          workspace: { select: { id: true, name: true, color: true } },
        },
        orderBy: [{ dueDate: "asc" }, { priority: "asc" }],
      });
    }),

  // GET ONE
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { session, prisma } = ctx;

      const task = await prisma.task.findFirst({
        where: {
          id: input.id,
          workspace: { userId: session.user.id },
        },
        include: {
          attachments: true,
          subtasks: true,
          workspace: { select: { id: true, name: true, color: true } },
        },
      });

      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return task;
    }),

  // UPDATE
  update: protectedProcedure
    .input(updateTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const { session, prisma } = ctx;

      // Verify ownership before update
      const existing = await prisma.task.findFirst({
        where: { id, workspace: { userId: session.user.id } },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Verify new workspace ownership if changing workspace
      if (data.workspaceId && data.workspaceId !== existing.workspaceId) {
        const newWorkspace = await prisma.workspace.findFirst({
          where: { id: data.workspaceId, userId: session.user.id },
        });
        if (!newWorkspace) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Target workspace not found or access denied",
          });
        }
      }

      return prisma.task.update({
        where: { id },
        data: {
          ...data,
          dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate,
        },
      });
    }),

  // MARK COMPLETE (convenience mutation)
  complete: protectedProcedure
    .input(z.object({ id: z.string(), completed: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { session, prisma } = ctx;

      const existing = await prisma.task.findFirst({
        where: { id: input.id, workspace: { userId: session.user.id } },
        include: { workspace: { select: { name: true, color: true } } },
      });

      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const result = await prisma.task.update({
        where: { id: input.id },
        data: {
          status: input.completed ? "DONE" : "TODO",
        },
      });

      await logActivity(
        prisma,
        session.user.id,
        input.completed ? "task.completed" : "task.reopened",
        input.id,
        {
          title: existing.title,
          workspace: existing.workspace.name,
          workspaceColor: existing.workspace.color,
        },
      );

      return result;
    }),

  // DELETE
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { session, prisma } = ctx;

      const existing = await prisma.task.findFirst({
        where: { id: input.id, workspace: { userId: session.user.id } },
        include: { workspace: { select: { name: true, color: true } } },
      });

      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      await logActivity(prisma, session.user.id, "task.deleted", input.id, {
        title: existing.title,
        workspace: existing.workspace.name,
        workspaceColor: existing.workspace.color,
      });

      await prisma.task.delete({ where: { id: input.id } });

      return { success: true };
    }),

  // LIST COMPLETED (last 50, ordered by completion time)
  listCompleted: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.task.findMany({
      where: {
        workspace: { userId: ctx.session.user.id },
        status: "DONE",
      },
      include: { workspace: { select: { id: true, name: true, color: true } } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
  }),

  // Count of Incomplete Tasks For Logged In User Grouped By Priority
  numberOfIncompleteTasks: protectedProcedure.query(async ({ ctx }) => {
    const counts = await ctx.prisma.task.groupBy({
      by: ["priority"],
      where: {
        workspace: { userId: ctx.session.user.id },
        status: { not: "DONE" },
      },
      _count: { id: true },
    });
    return counts;
  }),
});
