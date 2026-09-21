// apps/web/src/server/routers/habits.ts
import { router, protectedProcedure } from '../trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

/** "YYYY-MM-DD" -> UTC midnight Date, matching the @db.Date column */
function dateKeyToDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`)
}

/** UTC midnight Date -> "YYYY-MM-DD" */
function dateToKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const habitsRouter = router({

  // ── List ──────────────────────────────────────────────────────────────────
  // Returns every habit with its full completion history — stats (streaks,
  // weekly progress, history heatmap) are derived client-side from this.

  list: protectedProcedure.query(async ({ ctx }) => {
    const habits = await ctx.prisma.habit.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: 'asc' },
      include: { entries: { orderBy: { date: 'asc' } } },
    })

    return habits.map((h) => ({
      id: h.id,
      name: h.name,
      description: h.description,
      weeklyTarget: h.weeklyTarget,
      preferredDays: h.preferredDays,
      createdAt: h.createdAt,
      entries: h.entries.map((e) => ({ date: dateToKey(e.date), note: e.note })),
    }))
  }),

  // ── Create ────────────────────────────────────────────────────────────────

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(300).optional(),
      weeklyTarget: z.number().int().min(1).max(7),
      preferredDays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.habit.create({
        data: {
          userId: ctx.session.user.id,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          weeklyTarget: input.weeklyTarget,
          preferredDays: input.preferredDays,
        },
      })
    }),

  // ── Update ────────────────────────────────────────────────────────────────

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(300).nullable().optional(),
      weeklyTarget: z.number().int().min(1).max(7).optional(),
      preferredDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const habit = await ctx.prisma.habit.findUnique({ where: { id: input.id } })
      if (!habit || habit.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const { id, name, description, ...rest } = input

      return ctx.prisma.habit.update({
        where: { id },
        data: {
          ...rest,
          ...(name !== undefined ? { name: name.trim() } : {}),
          ...(description !== undefined ? { description: description?.trim() || null } : {}),
        },
      })
    }),

  // ── Delete ────────────────────────────────────────────────────────────────

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const habit = await ctx.prisma.habit.findUnique({ where: { id: input.id } })
      if (!habit || habit.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      await ctx.prisma.habit.delete({ where: { id: input.id } })
      return { success: true }
    }),

  // ── Set day ───────────────────────────────────────────────────────────────
  // completed:true upserts an entry (with optional note); completed:false
  // deletes it. Existence of a row *is* the "done" state — no status enum.

  setDay: protectedProcedure
    .input(z.object({
      habitId: z.string(),
      date: dateKey,
      completed: z.boolean(),
      note: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const habit = await ctx.prisma.habit.findUnique({ where: { id: input.habitId } })
      if (!habit || habit.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const date = dateKeyToDate(input.date)

      if (!input.completed) {
        await ctx.prisma.habitEntry.deleteMany({ where: { habitId: input.habitId, date } })
        return { success: true }
      }

      const note = input.note?.trim() || null

      await ctx.prisma.habitEntry.upsert({
        where: { habitId_date: { habitId: input.habitId, date } },
        create: { habitId: input.habitId, date, note },
        update: { note },
      })

      return { success: true }
    }),
})
