// apps/web/src/server/routers/snippets.ts
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

// ─── Input Schemas ────────────────────────────────────────────────────────────

const createSnippetSchema = z.object({
  title: z.string().min(1).max(500),
  code: z.string().min(1),
  language: z.string().default("plaintext"),
  tags: z.array(z.string()).default([]),
  workspaceId: z.string(),
});

const updateSnippetSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(500).optional(),
  code: z.string().min(1).optional(),
  language: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const listSnippetsSchema = z.object({
  workspaceId: z.string().optional(),
  language: z.string().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(), // title search
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function assertOwnership(
  prisma: Parameters<Parameters<typeof protectedProcedure.mutation>[0]>[0]["ctx"]["prisma"],
  snippetId: string,
  userId: string
) {
  const snippet = await prisma.snippet.findFirst({
    where: { id: snippetId, workspace: { userId } },
  });
  if (!snippet) throw new TRPCError({ code: "NOT_FOUND" });
  return snippet;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const snippetsRouter = router({
  // CREATE
  create: protectedProcedure
    .input(createSnippetSchema)
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

      return prisma.snippet.create({ data: input });
    }),

  // LIST (with filters)
  list: protectedProcedure
    .input(listSnippetsSchema)
    .query(async ({ ctx, input }) => {
      const { session, prisma } = ctx;

      return prisma.snippet.findMany({
        where: {
          workspace: { userId: session.user.id },
          ...(input.workspaceId && { workspaceId: input.workspaceId }),
          ...(input.language && { language: input.language }),
          ...(input.tags?.length && { tags: { hasSome: input.tags } }),
          ...(input.search && {
            title: { contains: input.search, mode: "insensitive" },
          }),
        },
        orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
      });
    }),

  // GET ONE
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { session, prisma } = ctx;

      const snippet = await prisma.snippet.findFirst({
        where: { id: input.id, workspace: { userId: session.user.id } },
      });

      if (!snippet) throw new TRPCError({ code: "NOT_FOUND" });

      return snippet;
    }),

  // UPDATE
  update: protectedProcedure
    .input(updateSnippetSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await assertOwnership(ctx.prisma, id, ctx.session.user.id);
      return ctx.prisma.snippet.update({ where: { id }, data });
    }),

  // DELETE
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnership(ctx.prisma, input.id, ctx.session.user.id);
      await ctx.prisma.snippet.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // TOGGLE FAVORITE
  toggleFavorite: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const snippet = await assertOwnership(
        ctx.prisma,
        input.id,
        ctx.session.user.id
      );
      return ctx.prisma.snippet.update({
        where: { id: input.id },
        data: { isFavorite: !snippet.isFavorite },
      });
    }),

  // INCREMENT USAGE (called when user copies snippet)
  incrementUsage: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnership(ctx.prisma, input.id, ctx.session.user.id);
      return ctx.prisma.snippet.update({
        where: { id: input.id },
        data: { usageCount: { increment: 1 } },
      });
    }),
});
