// apps/web/src/server/routers/scratchpads.ts
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

// ─── Input Schemas ────────────────────────────────────────────────────────────

const createScratchpadSchema = z.object({
  content: z.string().min(1),
  language: z.string().default("plaintext"),
  workspaceId: z.string(),
  expiresAt: z.string().datetime().optional().nullable(),
});

const updateScratchpadSchema = z.object({
  id: z.string(),
  content: z.string().min(1).optional(),
  language: z.string().optional(),
});

const promoteSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(500),
  tags: z.array(z.string()).default([]),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function assertOwnership(
  prisma: Parameters<Parameters<typeof protectedProcedure.mutation>[0]>[0]["ctx"]["prisma"],
  scratchpadId: string,
  userId: string
) {
  const pad = await prisma.scratchpad.findFirst({
    where: { id: scratchpadId, workspace: { userId } },
  });
  if (!pad) throw new TRPCError({ code: "NOT_FOUND" });
  return pad;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const scratchpadsRouter = router({
  // CREATE
  create: protectedProcedure
    .input(createScratchpadSchema)
    .mutation(async ({ ctx, input }) => {
      const { session, prisma } = ctx;

      const workspace = await prisma.workspace.findFirst({
        where: { id: input.workspaceId, userId: session.user.id },
      });

      if (!workspace) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Workspace not found or access denied",
        });
      }

      return prisma.scratchpad.create({
        data: {
          ...input,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        },
      });
    }),

  // LIST — excludes expired and promoted
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const { session, prisma } = ctx;

      const now = new Date();

      // Delete expired scratchpads for this user inline (cleanup on read)
      await prisma.scratchpad.deleteMany({
        where: {
          workspace: { userId: session.user.id },
          expiresAt: { lt: now },
        },
      });

      return prisma.scratchpad.findMany({
        where: {
          workspace: { userId: session.user.id },
          isPromoted: false,
          ...(input.workspaceId && { workspaceId: input.workspaceId }),
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { updatedAt: "desc" },
      });
    }),

  // GET ONE
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { session, prisma } = ctx;

      const pad = await prisma.scratchpad.findFirst({
        where: { id: input.id, workspace: { userId: session.user.id } },
      });

      if (!pad) throw new TRPCError({ code: "NOT_FOUND" });

      return pad;
    }),

  // UPDATE
  update: protectedProcedure
    .input(updateScratchpadSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await assertOwnership(ctx.prisma, id, ctx.session.user.id);
      return ctx.prisma.scratchpad.update({ where: { id }, data });
    }),

  // DELETE
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnership(ctx.prisma, input.id, ctx.session.user.id);
      await ctx.prisma.scratchpad.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // PROMOTE — convert scratchpad to snippet
  promote: protectedProcedure
    .input(promoteSchema)
    .mutation(async ({ ctx, input }) => {
      const { prisma, session } = ctx;

      const pad = await assertOwnership(prisma, input.id, session.user.id);

      // Create the snippet from scratchpad content
      const snippet = await prisma.snippet.create({
        data: {
          title: input.title,
          code: pad.content,
          language: pad.language,
          tags: input.tags,
          workspaceId: pad.workspaceId,
        },
      });

      // Mark scratchpad as promoted (soft-delete pattern)
      await prisma.scratchpad.update({
        where: { id: input.id },
        data: { isPromoted: true },
      });

      return snippet;
    }),

  // CLEANUP — delete all expired scratchpads for the current user
  cleanup: protectedProcedure.mutation(async ({ ctx }) => {
    const { count } = await ctx.prisma.scratchpad.deleteMany({
      where: {
        workspace: { userId: ctx.session.user.id },
        expiresAt: { lt: new Date() },
      },
    });

    return { deleted: count };
  }),
});
