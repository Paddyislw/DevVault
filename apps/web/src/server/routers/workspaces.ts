import { router, protectedProcedure } from '../trpc'

export const workspacesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.workspace.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        color: true,
        type: true,
        isDefault: true,
        slug: true,
      },
    })
  }),
})