import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

async function assertOwnership(prisma: any, userId: string, noteId: string) {
  const note = await prisma.note.findFirst({
    where: { id: noteId, workspace: { userId } },
  })
  if (!note) throw new Error('Not found')
  return note
}

export const notesRouter = router({
  create: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      title: z.string().min(1),
      content: z.string().default(''),
      type: z.enum(['NOTE', 'COMMAND']).default('NOTE'),
      command: z.string().optional(),
      language: z.string().optional(),
      warning: z.string().optional(),
      source: z.string().optional(),
      tags: z.array(z.string()).default([]),
      isPinned: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await ctx.prisma.workspace.findFirst({
        where: { id: input.workspaceId, userId: ctx.session.user.id },
      })
      if (!workspace) throw new Error('Workspace not found')
      return ctx.prisma.note.create({ data: input })
    }),

  list: protectedProcedure
    .input(z.object({
      type: z.enum(['NOTE', 'COMMAND']).optional(),
      search: z.string().optional(),
      workspaceId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.note.findMany({
        where: {
          workspace: { userId: ctx.session.user.id },
          ...(input.type && { type: input.type }),
          ...(input.workspaceId && { workspaceId: input.workspaceId }),
          ...(input.search && {
            OR: [
              { title: { contains: input.search, mode: 'insensitive' } },
              { content: { contains: input.search, mode: 'insensitive' } },
              { command: { contains: input.search, mode: 'insensitive' } },
            ],
          }),
        },
        orderBy: [{ isPinned: 'desc' }, { copyCount: 'desc' }, { createdAt: 'desc' }],
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      content: z.string().optional(),
      command: z.string().optional(),
      language: z.string().optional(),
      warning: z.string().optional(),
      source: z.string().optional(),
      tags: z.array(z.string()).optional(),
      isPinned: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      await assertOwnership(ctx.prisma, ctx.session.user.id, id)
      return ctx.prisma.note.update({ where: { id }, data })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnership(ctx.prisma, ctx.session.user.id, input.id)
      return ctx.prisma.note.delete({ where: { id: input.id } })
    }),

  incrementCopyCount: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.note.update({
        where: { id: input.id },
        data: { copyCount: { increment: 1 } },
      })
    }),

  togglePin: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const note = await assertOwnership(ctx.prisma, ctx.session.user.id, input.id)
      return ctx.prisma.note.update({
        where: { id: input.id },
        data: { isPinned: !note.isPinned },
      })
    }),
})