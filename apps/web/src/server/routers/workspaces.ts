import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const workspacesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.workspace.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        type: true,
        isDefault: true,
        slug: true,
      },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        color: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
        icon: z.string().max(4).optional(), // emoji, max 1 emoji = up to 4 chars
        type: z.enum(["PERSONAL", "WORK", "CUSTOM"]).default("CUSTOM"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Generate slug from name — lowercase, spaces to dashes, strip special chars
      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();

      // Ensure slug is unique for this user
      const existing = await ctx.prisma.workspace.findFirst({
        where: { userId, slug },
      });

      const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

      return ctx.prisma.workspace.create({
        data: {
          userId,
          name: input.name,
          color: input.color,
          icon: input.icon ?? null,
          type: input.type,
          slug: finalSlug,
          isDefault: false,
        },
        select: {
          id: true,
          name: true,
          color: true,
          icon: true,
          type: true,
          isDefault: true,
          slug: true,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(50).optional(),
        color: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
        icon: z.string().max(4).nullable().optional(),
        type: z.enum(["PERSONAL", "WORK", "CUSTOM"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const workspace = await ctx.prisma.workspace.findUnique({
        where: { id: input.id },
      });

      if (!workspace || workspace.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      const { id, ...data } = input;

      // Regenerate slug if name changed
      let slugUpdate = {};
      if (data.name && data.name !== workspace.name) {
        const newSlug = data.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim();

        const existing = await ctx.prisma.workspace.findFirst({
          where: { userId, slug: newSlug, NOT: { id } },
        });

        slugUpdate = { slug: existing ? `${newSlug}-${Date.now()}` : newSlug };
      }

      return ctx.prisma.workspace.update({
        where: { id },
        data: { ...data, ...slugUpdate },
        select: {
          id: true,
          name: true,
          color: true,
          icon: true,
          type: true,
          isDefault: true,
          slug: true,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const workspace = await ctx.prisma.workspace.findUnique({
        where: { id: input.id },
      });

      if (!workspace || workspace.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      if (workspace.isDefault) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete a default workspace",
        });
      }

      // Soft safety: check if workspace has any tasks before deleting
      const taskCount = await ctx.prisma.task.count({
        where: { workspaceId: input.id },
      });

      if (taskCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This workspace has ${taskCount} task${taskCount === 1 ? "" : "s"}. Move or delete them first.`,
        });
      }

      return ctx.prisma.workspace.delete({ where: { id: input.id } });
    }),
});
