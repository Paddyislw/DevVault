import { Worker, Queue, Job } from 'bullmq'
import { redisConnection } from '../connection'
import { prisma } from '@devvault/db'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  parseDigestSettings,
  getLocalTime,
  getLocalDayBounds,
  isInSlot,
} from '../../services/digest'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

const standupQueue = new Queue('standups', { connection: redisConnection })

// ─── Types ────────────────────────────────────────────────────────────────────

type StandupJobData = {
  // 'standup-daily' | 'recap-weekly' are legacy fixed-time crons — no-ops now,
  // kept in the union so stray queued jobs don't crash the worker
  type: 'digest-scan' | 'overdue-scan' | 'standup-daily' | 'recap-weekly'
}

// ─── Formatting Helpers ───────────────────────────────────────────────────────

const PRIORITY_EMOJI: Record<string, string> = {
  P1: '🔴',
  P2: '🟠',
  P3: '🔵',
  P4: '⚪',
}

/** Escapes user content for Telegram legacy-Markdown parse mode. */
function escapeMd(text: string): string {
  return text.replace(/([_*`\[])/g, '\\$1')
}

/** Renders a fixed-style bullet list; italic placeholder when empty. */
function bulletList(lines: string[], emptyLabel: string): string {
  if (lines.length === 0) return `• _${emptyLabel}_`
  return lines.map(line => `• ${line}`).join('\n')
}

// ─── Standup Generator ────────────────────────────────────────────────────────

async function generateStandup(
  userId: string,
  telegramId: string,
  timezone: string,
  sendMessage: (telegramId: string, text: string) => Promise<void>
) {
  const now = new Date()
  const { todayEnd, yesterdayStart, yesterdayEnd, dateKey } = getLocalDayBounds(timezone, now)

  // Check if standup already sent today (idempotency guard)
  const existingStandup = await prisma.standup.findUnique({
    where: { userId_date: { userId, date: dateKey } },
  })

  if (existingStandup) {
    console.log(`Standup already sent for user ${userId} today`)
    return
  }

  // Query tasks
  const [completedYesterday, pendingToday, blockedTasks] = await Promise.all([
    // Completed yesterday
    prisma.task.findMany({
      where: {
        workspace: { userId },
        status: 'DONE',
        updatedAt: { gte: yesterdayStart, lte: yesterdayEnd },
      },
      select: { title: true, priority: true, workspace: { select: { name: true } } },
    }),

    // Pending today (not done, not cancelled, not someday)
    prisma.task.findMany({
      where: {
        workspace: { userId },
        status: { notIn: ['DONE', 'CANCELLED'] },
        isSomeday: false,
        isBacklog: false,
        OR: [
          { dueDate: { lte: todayEnd } },
          { dueDate: null },
        ],
      },
      select: { title: true, priority: true, workspace: { select: { name: true } } },
      orderBy: { priority: 'asc' },
      take: 10, // cap at 10 for readability
    }),

    // Blocked tasks
    prisma.task.findMany({
      where: {
        workspace: { userId },
        status: 'BLOCKED',
      },
      select: { title: true, workspace: { select: { name: true } } },
    }),
  ])

  // Deterministic formatting — same bullet style every day, no AI variance
  const content = [
    '*Yesterday*',
    bulletList(
      completedYesterday.map(t => `${escapeMd(t.title)} — ${escapeMd(t.workspace.name)}`),
      'Nothing completed'
    ),
    '',
    '*Today*',
    bulletList(
      pendingToday.map(
        t => `${PRIORITY_EMOJI[t.priority] ?? '⚪'} ${escapeMd(t.title)} — ${escapeMd(t.workspace.name)}`
      ),
      'Nothing scheduled'
    ),
    '',
    '*Blockers*',
    bulletList(
      blockedTasks.map(t => `${escapeMd(t.title)} — ${escapeMd(t.workspace.name)}`),
      'None'
    ),
  ].join('\n')

  // Cache in DB
  await prisma.standup.create({
    data: {
      userId,
      date: dateKey,
      content,
      deliveredVia: 'telegram',
    },
  })

  // Send via Telegram
  const dateLabel = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: timezone,
  })
  const message = `📋 *Daily Standup*\n_${dateLabel}_\n\n${content}`
  await sendMessage(telegramId, message)

  console.log(`Standup delivered to ${telegramId}`)
}

// ─── Weekly Recap Generator ───────────────────────────────────────────────────

async function generateWeeklyRecap(
  userId: string,
  telegramId: string,
  timezone: string,
  sendMessage: (telegramId: string, text: string) => Promise<void>
) {
  const now = new Date()
  const { todayStart, weekStart } = getLocalDayBounds(timezone, now)

  // Idempotency guard — at most one weekly recap per local day
  const existingRecap = await prisma.recap.findFirst({
    where: { userId, type: 'WEEKLY', createdAt: { gte: todayStart } },
  })

  if (existingRecap) {
    console.log(`Weekly recap already sent for user ${userId} today`)
    return
  }

  // Count from the source tables directly — works no matter where the action
  // happened (web or bot), unlike ActivityLog which only web task writes feed
  const [completedTasks, createdTasks, snippetsSaved, notesSaved, bookmarksSaved] = await Promise.all([
    prisma.task.findMany({
      where: { workspace: { userId }, status: 'DONE', updatedAt: { gte: weekStart } },
      select: { updatedAt: true },
    }),
    prisma.task.findMany({
      where: { workspace: { userId }, createdAt: { gte: weekStart } },
      select: { createdAt: true },
    }),
    prisma.snippet.count({
      where: { workspace: { userId }, createdAt: { gte: weekStart } },
    }),
    prisma.note.count({
      where: { workspace: { userId }, createdAt: { gte: weekStart } },
    }),
    prisma.bookmark.count({
      where: { workspace: { userId }, createdAt: { gte: weekStart } },
    }),
  ])

  // Most productive day — by task activity, in the user's timezone
  const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayMap: Record<string, number> = {}
  for (const t of completedTasks) {
    const day = WEEKDAY_NAMES[getLocalTime(timezone, t.updatedAt).weekday]
    dayMap[day] = (dayMap[day] ?? 0) + 1
  }
  for (const t of createdTasks) {
    const day = WEEKDAY_NAMES[getLocalTime(timezone, t.createdAt).weekday]
    dayMap[day] = (dayMap[day] ?? 0) + 1
  }
  const mostProductiveDay = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A'

  const stats = {
    tasksCompleted: completedTasks.length,
    tasksCreated: createdTasks.length,
    snippetsSaved,
    notesSaved,
    bookmarksSaved,
    completionRate:
      createdTasks.length > 0 ? Math.round((completedTasks.length / createdTasks.length) * 100) : 0,
    mostProductiveDay,
  }

  // Deterministic stats block — numbers never depend on the AI
  const statLines = [
    `• Tasks completed: ${stats.tasksCompleted}`,
    `• Tasks created: ${stats.tasksCreated}`,
    `• Snippets saved: ${stats.snippetsSaved}`,
    `• Notes saved: ${stats.notesSaved}`,
    `• Bookmarks saved: ${stats.bookmarksSaved}`,
  ]
  if (stats.tasksCreated > 0) {
    statLines.push(`• Completion rate: ${stats.completionRate}%`)
  }
  if (stats.mostProductiveDay !== 'N/A') {
    statLines.push(`• Most productive day: ${stats.mostProductiveDay}`)
  }

  // Short AI note on top of the fixed stats — recap still sends if Gemini fails
  let aiNote = 'Keep shipping — see you next week 👋'
  try {
    const prompt = `Write a short encouraging note (2-3 sentences, under 60 words) for a developer's weekly recap, ending with one actionable productivity tip. Be honest but motivating, casual tone, plain text only — no headers, no bullet lists, no markdown besides *bold*.

Stats this week:
- Tasks completed: ${stats.tasksCompleted}
- Tasks created: ${stats.tasksCreated}
- Completion rate: ${stats.completionRate}%
- Snippets saved: ${stats.snippetsSaved}
- Notes saved: ${stats.notesSaved}
- Bookmarks saved: ${stats.bookmarksSaved}
- Most productive day: ${stats.mostProductiveDay}`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    if (text) aiNote = text
  } catch (err) {
    console.error('Recap AI note failed, using fallback:', err)
  }

  const content = `${statLines.join('\n')}\n\n${aiNote}`

  // Cache in DB
  await prisma.recap.create({
    data: {
      userId,
      periodStart: weekStart,
      periodEnd: todayStart,
      type: 'WEEKLY',
      content,
      stats,
    },
  })

  // Send via Telegram
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: timezone })
  const weekLabel = `${fmt(weekStart)} – ${fmt(now)}`
  const message = `📊 *Weekly Recap*\n_${weekLabel}_\n\n${content}`
  await sendMessage(telegramId, message)

  console.log(`Weekly recap delivered to ${telegramId}`)
}

// ─── Digest Scan ──────────────────────────────────────────────────────────────

/**
 * Runs every 15 minutes. For each user, checks their digest settings and
 * delivers the standup/recap whose configured time falls in the current slot.
 * Generators are idempotent per local day, so a re-run can't double-send.
 */
async function runDigestScan(
  sendMessage: (telegramId: string, text: string) => Promise<void>
) {
  const users = await prisma.user.findMany({
    select: { id: true, telegramId: true, aiSettings: true },
  })

  const now = new Date()

  await Promise.allSettled(
    users.map(async user => {
      if (!user.telegramId) return

      const settings = parseDigestSettings(user.aiSettings)
      const local = getLocalTime(settings.timezone, now)

      if (settings.standupEnabled && isInSlot(settings.standupTime, local)) {
        await generateStandup(user.id, user.telegramId, settings.timezone, sendMessage)
      }

      if (
        settings.recapEnabled &&
        local.weekday === settings.recapDay &&
        isInSlot(settings.recapTime, local)
      ) {
        await generateWeeklyRecap(user.id, user.telegramId, settings.timezone, sendMessage)
      }
    })
  )
}

// ─── Overdue Task Scanner ─────────────────────────────────────────────────────

async function scanOverdueTasks(
  reminderQueueInstance: Queue,
) {
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  // 9am tomorrow
  const tomorrowNine = new Date(todayStart)
  tomorrowNine.setDate(tomorrowNine.getDate() + 1)
  tomorrowNine.setHours(9, 0, 0, 0)

  const delay = Math.max(0, tomorrowNine.getTime() - Date.now())

  // Find all overdue incomplete tasks with users who have telegramId
  const overdueTasks = await prisma.task.findMany({
    where: {
      dueDate: { lt: todayStart },
      status: { notIn: ['DONE', 'CANCELLED'] },
      isSomeday: false,
    },
    include: {
      workspace: {
        include: {
          user: { select: { id: true, telegramId: true } },
        },
      },
    },
  })

  let scheduled = 0

  for (const task of overdueTasks) {
    const user = task.workspace.user
    if (!user.telegramId) continue

    // jobId = task.id ensures deduplication —
    // same overdue task won't get multiple reminders even if scanner runs twice
    await reminderQueueInstance.add(
      'reminder-delivery',
      {
        reminderId: `overdue-${task.id}`, // not a real reminder row — synthetic job
        userId: user.id,
        telegramId: user.telegramId,
        title: `⚠️ Overdue: ${task.title}`,
        description: `This task was due ${task.dueDate!.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. Still pending.`,
        repeatRule: null,
        remindAt: tomorrowNine.toISOString(),
      },
      {
        delay,
        jobId: `overdue-${task.id}`, // deduplication key
        attempts: 2,
        removeOnComplete: { age: 86400 },
      }
    )

    scheduled++
  }

  console.log(`Overdue scan complete — scheduled ${scheduled} reminders`)
}

// ─── Register Cron Jobs ───────────────────────────────────────────────────────

/**
 * Registers all repeatable cron jobs into the standups queue.
 * Call once on bot startup — BullMQ stores the schedule in Redis,
 * so calling this multiple times is safe (idempotent by name).
 */
export async function registerCronJobs() {
  // Remove legacy fixed-time crons — replaced by the per-user digest scan
  const repeatableJobs = await standupQueue.getRepeatableJobs()
  for (const job of repeatableJobs) {
    if (job.name === 'standup-daily' || job.name === 'recap-weekly') {
      await standupQueue.removeRepeatableByKey(job.key)
      console.log(`Removed legacy repeatable job: ${job.name}`)
    }
  }

  // Digest scan — every 15 minutes; delivers per-user standups/recaps
  // at whatever time each user configured in Settings
  await standupQueue.add(
    'digest-scan',
    { type: 'digest-scan' },
    {
      repeat: { pattern: '*/15 * * * *' },
      jobId: 'digest-scan-cron',
    }
  )

  // Overdue scanner — every night 11:59 PM IST = 18:29 UTC
  await standupQueue.add(
    'overdue-scan',
    { type: 'overdue-scan' },
    {
      repeat: { pattern: '29 18 * * *' }, // cron: 18:29 UTC = 11:59 PM IST
      jobId: 'overdue-scan-cron',
    }
  )

  console.log('✅ Cron jobs registered: digest-scan (every 15 min), overdue-scan')
}

// ─── Start Worker ─────────────────────────────────────────────────────────────

export function startStandupWorker(
  sendMessage: (telegramId: string, text: string) => Promise<void>,
  reminderQueueInstance: Queue,
) {
  const worker = new Worker<StandupJobData>(
    'standups',
    async (job: Job<StandupJobData>) => {
      const { type } = job.data

      console.log(`Processing standup job: ${type}`)

      if (type === 'digest-scan') {
        await runDigestScan(sendMessage)
      } else if (type === 'overdue-scan') {
        await scanOverdueTasks(reminderQueueInstance)
      } else {
        // Legacy 'standup-daily' / 'recap-weekly' jobs left in Redis — skip
        console.log(`Skipping legacy job type: ${type}`)
      }
    },
    {
      connection: redisConnection,
      concurrency: 1, // process one cron job at a time — they fan out internally
    }
  )

  worker.on('completed', (job) => {
    console.log(`✅ Standup job ${job.name} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`❌ Standup job ${job?.name} failed:`, err.message)
  })

  console.log('Standup worker started')
  return worker
}
