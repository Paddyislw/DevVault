// apps/web/src/server/routers/envSets.ts
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function assertOwnership(
  prisma: Parameters<Parameters<typeof protectedProcedure.mutation>[0]>[0]["ctx"]["prisma"],
  envSetId: string,
  userId: string
) {
  const envSet = await prisma.envSet.findFirst({
    where: { id: envSetId, workspace: { userId } },
  });
  if (!envSet) throw new TRPCError({ code: "NOT_FOUND" });
  return envSet;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const envSetsRouter = router({
  // CREATE
  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        projectName: z.string().min(1).max(100),
        environment: z.enum(["DEV", "STAGING", "PROD"]).default("DEV"),
        variables: z.string(), // encrypted JSON string from client
      })
    )
    .mutation(async ({ ctx, input }) => {
      const workspace = await ctx.prisma.workspace.findFirst({
        where: { id: input.workspaceId, userId: ctx.session.user.id },
      });
      if (!workspace) throw new TRPCError({ code: "FORBIDDEN" });

      // Check for duplicate project+env combo
      const existing = await ctx.prisma.envSet.findFirst({
        where: {
          workspaceId: input.workspaceId,
          projectName: input.projectName,
          environment: input.environment as any,
        },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `${input.environment} environment already exists for ${input.projectName}`,
        });
      }

      return ctx.prisma.envSet.create({
        data: {
          workspaceId: input.workspaceId,
          projectName: input.projectName,
          environment: input.environment as any,
          variables: input.variables,
        },
      });
    }),

  // LIST — grouped by project
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const envSets = await ctx.prisma.envSet.findMany({
        where: {
          workspace: { userId: ctx.session.user.id },
          ...(input.workspaceId && { workspaceId: input.workspaceId }),
        },
        orderBy: [{ projectName: "asc" }, { environment: "asc" }],
        select: {
          id: true,
          workspaceId: true,
          projectName: true,
          environment: true,
          variables: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return envSets;
    }),

  // GET BY ID
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const envSet = await ctx.prisma.envSet.findFirst({
        where: { id: input.id, workspace: { userId: ctx.session.user.id } },
      });
      if (!envSet) throw new TRPCError({ code: "NOT_FOUND" });
      return envSet;
    }),

  // UPDATE variables
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        variables: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwnership(ctx.prisma, input.id, ctx.session.user.id);
      return ctx.prisma.envSet.update({
        where: { id: input.id },
        data: { variables: input.variables },
      });
    }),

  // DELETE
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnership(ctx.prisma, input.id, ctx.session.user.id);
      await ctx.prisma.envSet.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // LIST PROJECTS — unique project names for sidebar
  listProjects: protectedProcedure
    .input(z.object({ workspaceId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const envSets = await ctx.prisma.envSet.findMany({
        where: {
          workspace: { userId: ctx.session.user.id },
          ...(input.workspaceId && { workspaceId: input.workspaceId }),
        },
        select: { projectName: true },
        distinct: ["projectName"],
        orderBy: { projectName: "asc" },
      });

      return envSets.map((e) => e.projectName);
    }),

  // COMPARE — return two envSets side by side
  compare: protectedProcedure
    .input(
      z.object({
        envSetIdA: z.string(),
        envSetIdB: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [a, b] = await Promise.all([
        assertOwnership(ctx.prisma, input.envSetIdA, ctx.session.user.id),
        assertOwnership(ctx.prisma, input.envSetIdB, ctx.session.user.id),
      ]);

      return { a, b };
    }),
});