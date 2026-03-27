import { router, protectedProcedure } from '../trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { reminderQueue } from '@/lib/queue'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** ms from now until a given date */
function msUntil(date: Date): number {
  return Math.max(0, date.getTime() - Date.now())
}

/**
 * Given a reminder's remindAt and repeatRule, returns the next Date it should fire.
 * Returns null if no repeat rule.
 */
function nextOccurrence(remindAt: Date, repeatRule: string | null): Date | null {
  if (!repeatRule) return null

  const next = new Date(remindAt)

  switch (repeatRule) {
    case 'DAILY':
      next.setDate(next.getDate() + 1)
      break
    case 'WEEKLY':
      next.setDate(next.getDate() + 7)
      break
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1)
      break
    default:
      return null
  }

  return next
}

/**
 * Schedules a BullMQ delayed job for a reminder.
 * Uses reminderId as jobId so re-scheduling replaces the old job automatically.
 */
async function scheduleReminderJob(reminder: {
  id: string
  userId: string
  title: string
  description: string | null
  remindAt: Date
  repeatRule: string | null
  telegramId: string
}) {
  const delay = msUntil(reminder.remindAt)

  await reminderQueue.add(
    'reminder-delivery',
    {
      reminderId: reminder.id,
      userId: reminder.userId,
      telegramId: reminder.telegramId,
      title: reminder.title,
      description: reminder.description,
      repeatRule: reminder.repeatRule,
      remindAt: reminder.remindAt.toISOString(),
    },
    {
      delay,
      jobId: reminder.id, // ensures only one job per reminder — replaces on reschedule
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 86400 }, // clean up completed jobs after 24h
      removeOnFail: { age: 604800 },    // keep failed jobs for 7 days for debugging
    }
  )
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const remindersRouter = router({

  // ── Create ────────────────────────────────────────────────────────────────

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(1000).optional(),
      remindAt: z.string().datetime(), // ISO string from client
      repeatRule: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).nullable().default(null),
      repeatEndDate: z.string().datetime().nullable().optional(),
      category: z.enum(['PROFESSIONAL', 'PERSONAL', 'BILLING', 'INFRA', 'CUSTOM']).default('PROFESSIONAL'),
      priority: z.enum(['P1', 'P2', 'P3', 'P4']).nullable().optional(),
      workspaceId: z.string().nullable().optional(),
      linkedEntityType: z.string().nullable().optional(), // 'task' | 'note' | etc
      linkedEntityId: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      // Get user's telegramId — needed for delivery
      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, telegramId: true },
      })

      if (!user) throw new TRPCError({ code: 'NOT_FOUND' })

      const remindAt = new Date(input.remindAt)

      if (remindAt <= new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Reminder time must be in the future',
        })
      }

      // Save to DB
      const reminder = await ctx.prisma.reminder.create({
        data: {
          userId,
          title: input.title,
          description: input.description ?? null,
          remindAt,
          repeatRule: input.repeatRule ?? null,
          repeatEndDate: input.repeatEndDate ? new Date(input.repeatEndDate) : null,
          category: input.category,
          priority: input.priority ?? null,
          workspaceId: input.workspaceId ?? null,
          linkedEntityType: input.linkedEntityType ?? null,
          linkedEntityId: input.linkedEntityId ?? null,
          status: 'PENDING',
        },
      })

      // Schedule BullMQ job
      await scheduleReminderJob({
        id: reminder.id,
        userId,
        title: reminder.title,
        description: reminder.description,
        remindAt,
        repeatRule: reminder.repeatRule,
        telegramId: user.telegramId,
      })

      return reminder
    }),

  // ── List ──────────────────────────────────────────────────────────────────

  list: protectedProcedure
    .input(z.object({
      filter: z.enum(['upcoming', 'snoozed', 'delivered', 'all']).default('upcoming'),
      category: z.enum(['PROFESSIONAL', 'PERSONAL', 'BILLING', 'INFRA', 'CUSTOM']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const where: Record<string, unknown> = { userId }

      switch (input.filter) {
        case 'upcoming':
          where.status = { in: ['PENDING', 'SNOOZED'] }
          break
        case 'snoozed':
          where.status = 'SNOOZED'
          break
        case 'delivered':
          where.status = 'DELIVERED'
          break
        // 'all' — no status filter
      }

      if (input.category) {
        where.category = input.category
      }

      return ctx.prisma.reminder.findMany({
        where,
        orderBy: { remindAt: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          remindAt: true,
          repeatRule: true,
          repeatEndDate: true,
          category: true,
          priority: true,
          status: true,
          snoozedUntil: true,
          deliveredAt: true,
          linkedEntityType: true,
          linkedEntityId: true,
          workspaceId: true,
          createdAt: true,
        },
      })
    }),

  // ── Update ────────────────────────────────────────────────────────────────

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(1000).nullable().optional(),
      remindAt: z.string().datetime().optional(),
      repeatRule: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).nullable().optional(),
      category: z.enum(['PROFESSIONAL', 'PERSONAL', 'BILLING', 'INFRA', 'CUSTOM']).optional(),
      priority: z.enum(['P1', 'P2', 'P3', 'P4']).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const reminder = await ctx.prisma.reminder.findUnique({ where: { id: input.id } })

      if (!reminder || reminder.userId !== userId) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const { id, remindAt: remindAtStr, ...rest } = input
      const remindAt = remindAtStr ? new Date(remindAtStr) : reminder.remindAt

      const updated = await ctx.prisma.reminder.update({
        where: { id },
        data: { ...rest, remindAt, status: 'PENDING' },
      })

      // Reschedule — jobId is reminderId so BullMQ replaces the old job
      if (updated.status === 'PENDING') {
        const user = await ctx.prisma.user.findUnique({
          where: { id: userId },
          select: { telegramId: true },
        })

        if (user) {
          // Remove old job first then re-add (in case delay changed)
          const oldJob = await reminderQueue.getJob(id)
          if (oldJob) await oldJob.remove()

          await scheduleReminderJob({
            id: updated.id,
            userId,
            title: updated.title,
            description: updated.description,
            remindAt,
            repeatRule: updated.repeatRule,
            telegramId: user.telegramId,
          })
        }
      }

      return updated
    }),

  // ── Snooze ────────────────────────────────────────────────────────────────

  snooze: protectedProcedure
    .input(z.object({
      id: z.string(),
      // duration in minutes: 60 = 1hr, 1440 = 1 day, 10080 = 1 week
      minutes: z.number().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const reminder = await ctx.prisma.reminder.findUnique({ where: { id: input.id } })
      if (!reminder || reminder.userId !== userId) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const snoozedUntil = new Date(Date.now() + input.minutes * 60 * 1000)

      const updated = await ctx.prisma.reminder.update({
        where: { id: input.id },
        data: { status: 'SNOOZED', snoozedUntil },
      })

      // Reschedule job to fire at snoozedUntil
      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: { telegramId: true },
      })

      if (user) {
        const oldJob = await reminderQueue.getJob(input.id)
        if (oldJob) await oldJob.remove()

        await scheduleReminderJob({
          id: reminder.id,
          userId,
          title: reminder.title,
          description: reminder.description,
          remindAt: snoozedUntil,
          repeatRule: reminder.repeatRule,
          telegramId: user.telegramId,
        })
      }

      return updated
    }),

  // ── Dismiss ───────────────────────────────────────────────────────────────

  dismiss: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const reminder = await ctx.prisma.reminder.findUnique({ where: { id: input.id } })
      if (!reminder || reminder.userId !== userId) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      // Remove from queue so it never fires
      const job = await reminderQueue.getJob(input.id)
      if (job) await job.remove()

      return ctx.prisma.reminder.update({
        where: { id: input.id },
        data: { status: 'DISMISSED' },
      })
    }),

  // ── Delete ────────────────────────────────────────────────────────────────

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const reminder = await ctx.prisma.reminder.findUnique({ where: { id: input.id } })
      if (!reminder || reminder.userId !== userId) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      // Remove BullMQ job before deleting from DB
      const job = await reminderQueue.getJob(input.id)
      if (job) await job.remove()

      return ctx.prisma.reminder.delete({ where: { id: input.id } })
    }),

  // ── Upcoming count (for sidebar badge) ───────────────────────────────────

  upcomingCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.prisma.reminder.count({
      where: {
        userId: ctx.session.user.id,
        status: { in: ['PENDING', 'SNOOZED'] },
        remindAt: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // next 7 days
      },
    })
    return { count }
  }),
})