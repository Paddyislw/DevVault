import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

async function assertOwnership(prisma: any, userId: string, ideaId: string) {
  const idea = await prisma.projectIdea.findFirst({
    where: { id: ideaId, userId },
  })
  if (!idea) throw new TRPCError({ code: 'NOT_FOUND' })
  return idea
}

export const ideasRouter = router({
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      techStack: z.array(z.string()).default([]),
      references: z.array(z.string()).default([]),
      status: z.enum(['RAW', 'EXPLORING', 'COMMITTED', 'ABANDONED']).default('RAW'),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.projectIdea.create({
        data: { ...input, userId: ctx.session.user.id },
      })
    }),

  list: protectedProcedure
    .input(z.object({
      status: z.enum(['RAW', 'EXPLORING', 'COMMITTED', 'ABANDONED']).optional(),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.projectIdea.findMany({
        where: {
          userId: ctx.session.user.id,
          ...(input.status && { status: input.status }),
          ...(input.search && {
            OR: [
              { title: { contains: input.search, mode: 'insensitive' } },
              { description: { contains: input.search, mode: 'insensitive' } },
            ],
          }),
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      techStack: z.array(z.string()).optional(),
      references: z.array(z.string()).optional(),
      status: z.enum(['RAW', 'EXPLORING', 'COMMITTED', 'ABANDONED']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      await assertOwnership(ctx.prisma, ctx.session.user.id, id)
      return ctx.prisma.projectIdea.update({ where: { id }, data })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnership(ctx.prisma, ctx.session.user.id, input.id)
      return ctx.prisma.projectIdea.delete({ where: { id: input.id } })
    }),

  // Promote to workspace — creates workspace + links idea to it
  promote: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const idea = await assertOwnership(ctx.prisma, ctx.session.user.id, input.id)

      if (idea.promotedToWorkspaceId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Already promoted' })
      }

      // Create workspace from idea
      const slug = idea.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const workspace = await ctx.prisma.workspace.create({
        data: {
          userId: ctx.session.user.id,
          name: idea.title,
          slug: `${slug}-${Date.now()}`, // suffix to avoid collisions
          type: 'CUSTOM',
          color: '#4a9eed',
        },
      })

      // Link idea to workspace + mark as committed
      return ctx.prisma.projectIdea.update({
        where: { id: input.id },
        data: {
          promotedToWorkspaceId: workspace.id,
          status: 'COMMITTED',
        },
      })
    }),
})