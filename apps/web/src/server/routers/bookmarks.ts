import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { fetchUrlMetadata } from '@/lib/metadata'

async function assertOwnership(prisma: any, userId: string, bookmarkId: string) {
  const bookmark = await prisma.bookmark.findFirst({
    where: { id: bookmarkId, workspace: { userId } },
  })
  if (!bookmark) throw new TRPCError({ code: 'NOT_FOUND' })
  return bookmark
}

export const bookmarksRouter = router({
  create: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      url: z.string().url(),
      category: z.enum(['DESIGN', 'CODE', 'TUTORIALS', 'TOOLS', 'APIS_DOCS', 'CUSTOM']).default('CUSTOM'),
      tags: z.array(z.string()).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await ctx.prisma.workspace.findFirst({
        where: { id: input.workspaceId, userId: ctx.session.user.id },
      })
      if (!workspace) throw new TRPCError({ code: 'NOT_FOUND' })

      // Auto-fetch metadata server-side
      const metadata = await fetchUrlMetadata(input.url)

      return ctx.prisma.bookmark.create({
        data: {
          workspaceId: input.workspaceId,
          url: input.url,
          title: metadata.title,
          description: metadata.description,
          favicon: metadata.favicon,
          category: input.category,
          tags: input.tags,
          isAlive: true,
          lastCheckedAt: new Date(),
        },
      })
    }),

  list: protectedProcedure
    .input(z.object({
      category: z.enum(['DESIGN', 'CODE', 'TUTORIALS', 'TOOLS', 'APIS_DOCS', 'CUSTOM']).optional(),
      search: z.string().optional(),
      workspaceId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.bookmark.findMany({
        where: {
          workspace: { userId: ctx.session.user.id },
          ...(input.category && { category: input.category }),
          ...(input.workspaceId && { workspaceId: input.workspaceId }),
          ...(input.search && {
            OR: [
              { title: { contains: input.search, mode: 'insensitive' } },
              { url: { contains: input.search, mode: 'insensitive' } },
              { description: { contains: input.search, mode: 'insensitive' } },
            ],
          }),
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      category: z.enum(['DESIGN', 'CODE', 'TUTORIALS', 'TOOLS', 'APIS_DOCS', 'CUSTOM']).optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      await assertOwnership(ctx.prisma, ctx.session.user.id, id)
      return ctx.prisma.bookmark.update({ where: { id }, data })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnership(ctx.prisma, ctx.session.user.id, input.id)
      return ctx.prisma.bookmark.delete({ where: { id: input.id } })
    }),

  // Refetch metadata for a single bookmark — manual refresh
  refreshMetadata: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const bookmark = await assertOwnership(ctx.prisma, ctx.session.user.id, input.id)
      const metadata = await fetchUrlMetadata(bookmark.url)
      return ctx.prisma.bookmark.update({
        where: { id: input.id },
        data: {
          title: metadata.title ?? bookmark.title,
          description: metadata.description ?? bookmark.description,
          favicon: metadata.favicon ?? bookmark.favicon,
          lastCheckedAt: new Date(),
        },
      })
    }),

  // Check if a bookmark URL is alive — ping it
  checkAlive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const bookmark = await assertOwnership(ctx.prisma, ctx.session.user.id, input.id)
      let isAlive = false
      try {
        const res = await fetch(bookmark.url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
        })
        isAlive = res.ok
      } catch {
        isAlive = false
      }
      return ctx.prisma.bookmark.update({
        where: { id: input.id },
        data: { isAlive, lastCheckedAt: new Date() },
      })
    }),
})