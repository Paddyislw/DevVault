import { Worker, Job } from 'bullmq'
import { redisConnection } from '../connection'
import { reminderQueue } from '../queue'
import { prisma } from '@devvault/db'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReminderJobData = {
  reminderId: string
  userId: string
  telegramId: string
  title: string
  description: string | null
  repeatRule: 'DAILY' | 'WEEKLY' | 'MONTHLY' | null
  remindAt: string // ISO string
}

// ─── Next occurrence helper ───────────────────────────────────────────────────

function nextOccurrence(remindAt: Date, repeatRule: string): Date {
  const next = new Date(remindAt)
  switch (repeatRule) {
    case 'DAILY':   next.setDate(next.getDate() + 1); break
    case 'WEEKLY':  next.setDate(next.getDate() + 7); break
    case 'MONTHLY': next.setMonth(next.getMonth() + 1); break
  }
  return next
}

// ─── Category emoji map ───────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  PROFESSIONAL: '💼',
  PERSONAL:     '🏠',
  BILLING:      '💳',
  INFRA:        '🖥️',
  CUSTOM:       '📌',
}

// ─── Worker ───────────────────────────────────────────────────────────────────

export function startReminderWorker(
  sendMessage: (telegramId: string, text: string, options?: object) => Promise<void>
) {
  const worker = new Worker<ReminderJobData>(
    'reminders',
    async (job: Job<ReminderJobData>) => {
      const { reminderId, telegramId, title, description, repeatRule, remindAt } = job.data

      // Fetch reminder to check it's still PENDING/SNOOZED (user may have dismissed)
      const reminder = await prisma.reminder.findUnique({
        where: { id: reminderId },
        select: { status: true, category: true },
      })

      // Skip if dismissed or already delivered
      if (!reminder || reminder.status === 'DISMISSED' || reminder.status === 'DELIVERED') {
        console.log(`Skipping reminder ${reminderId} — status: ${reminder?.status}`)
        return
      }

      const emoji = CATEGORY_EMOJI[reminder.category] ?? '🔔'
      const repeatLabel = repeatRule ? ` (repeats ${repeatRule.toLowerCase()})` : ''

      const lines = [
        `${emoji} *Reminder*${repeatLabel}`,
        '',
        `*${title}*`,
        description ? description : '',
      ].filter(line => line !== undefined && !(line === '' && !description))

      // Inline buttons — callback data format: action:reminderId
      const inlineKeyboard = {
        inline_keyboard: [[
          { text: '✅ Done',       callback_data: `reminder:done:${reminderId}` },
          { text: '⏰ 1 hour',     callback_data: `reminder:snooze:60:${reminderId}` },
          { text: '📅 Tomorrow',   callback_data: `reminder:snooze:1440:${reminderId}` },
          { text: '🗓 1 week',     callback_data: `reminder:snooze:10080:${reminderId}` },
        ], [
          { text: '❌ Dismiss',    callback_data: `reminder:dismiss:${reminderId}` },
        ]],
      }

      await sendMessage(telegramId, lines.join('\n'), {
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard,
      })

      // Mark as delivered
      await prisma.reminder.update({
        where: { id: reminderId },
        data: { status: 'DELIVERED', deliveredAt: new Date() },
      })

      // If recurring, schedule next occurrence
      if (repeatRule) {
        const reminder = await prisma.reminder.findUnique({
          where: { id: reminderId },
          select: { repeatEndDate: true },
        })

        const next = nextOccurrence(new Date(remindAt), repeatRule)

        // Don't schedule past repeatEndDate
        if (!reminder?.repeatEndDate || next <= reminder.repeatEndDate) {
          // Reset status to PENDING for next occurrence
          await prisma.reminder.update({
            where: { id: reminderId },
            data: { status: 'PENDING', remindAt: next },
          })

          await reminderQueue.add(
            'reminder-delivery',
            { ...job.data, remindAt: next.toISOString() },
            {
              delay: Math.max(0, next.getTime() - Date.now()),
              jobId: `${reminderId}-${next.getTime()}`, // unique jobId per occurrence
              attempts: 3,
              backoff: { type: 'exponential', delay: 5000 },
              removeOnComplete: { age: 86400 },
            }
          )

          console.log(`Recurring reminder ${reminderId} rescheduled for ${next.toISOString()}`)
        }
      }
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  )

  worker.on('completed', (job) => {
    console.log(`✅ Reminder job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`❌ Reminder job ${job?.id} failed:`, err.message)
  })

  console.log('Reminder worker started')
  return worker
}