// apps/web/src/server/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ZodError } from 'zod'

export const createContext = async () => {
  const session = await getServerSession(authOptions)
  return { session, prisma }
}

export type Context = Awaited<ReturnType<typeof createContext>>

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure

// Protected procedure — throws if not logged in
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session, // now narrowed — session is defined
    },
  })
})