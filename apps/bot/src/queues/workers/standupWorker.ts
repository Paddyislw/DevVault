import { Worker, Queue, Job } from 'bullmq'
import { redisConnection } from '../connection'
import { prisma } from '@devvault/db'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

const standupQueue = new Queue('standups', { connection: redisConnection })

// ─── Types ────────────────────────────────────────────────────────────────────

type StandupJobData = {
  type: 'standup-daily' | 'recap-weekly' | 'overdue-scan'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateRange() {
  const now = new Date()

  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  const yesterdayEnd = new Date(todayEnd)
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1)

  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)

  return { todayStart, todayEnd, yesterdayStart, yesterdayEnd, weekStart }
}

// ─── Standup Generator ────────────────────────────────────────────────────────

async function generateStandup(
  userId: string,
  telegramId: string,
  sendMessage: (telegramId: string, text: string) => Promise<void>
) {
  const { todayStart, todayEnd, yesterdayStart, yesterdayEnd } = getDateRange()

  // Check if standup already sent today (idempotency guard)
  const existingStandup = await prisma.standup.findUnique({
    where: { userId_date: { userId, date: todayStart } },
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

  // Build prompt for Gemini
  const dataForAI = {
    completedYesterday: completedYesterday.map(t => `${t.priority}: ${t.title} (${t.workspace.name})`),
    pendingToday: pendingToday.map(t => `${t.priority}: ${t.title} (${t.workspace.name})`),
    blockers: blockedTasks.map(t => `${t.title} (${t.workspace.name})`),
  }

  const prompt = `Generate a concise daily standup update for a developer. 
Format it with three sections: Yesterday, Today, Blockers.
Keep it brief and professional. Use bullet points. No fluff.

Data:
Yesterday completed: ${dataForAI.completedYesterday.join(', ') || 'Nothing completed'}
Today pending: ${dataForAI.pendingToday.join(', ') || 'Nothing scheduled'}
Blockers: ${dataForAI.blockers.join(', ') || 'None'}

Respond in plain text with emoji bullets. No markdown headers, use bold with asterisks for section names.`

  const result = await model.generateContent(prompt)
  const content = result.response.text().trim()

  // Cache in DB
  await prisma.standup.create({
    data: {
      userId,
      date: todayStart,
      content,
      deliveredVia: 'telegram',
    },
  })

  // Send via Telegram
  const message = `📋 *Daily Standup*\n_${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}_\n\n${content}`
  await sendMessage(telegramId, message)

  console.log(`Standup delivered to ${telegramId}`)
}

// ─── Weekly Recap Generator ───────────────────────────────────────────────────

async function generateWeeklyRecap(
  userId: string,
  telegramId: string,
  sendMessage: (telegramId: string, text: string) => Promise<void>
) {
  const { todayStart, weekStart } = getDateRange()

  // Aggregate stats from ActivityLog — pure SQL, no AI needed for numbers
  const [
    tasksCompleted,
    tasksCreated,
    snippetsSaved,
    notesSaved,
    bookmarksSaved,
    activityByDay,
  ] = await Promise.all([
    prisma.activityLog.count({
      where: { userId, action: 'completed', entityType: 'task', createdAt: { gte: weekStart } },
    }),
    prisma.activityLog.count({
      where: { userId, action: 'created', entityType: 'task', createdAt: { gte: weekStart } },
    }),
    prisma.activityLog.count({
      where: { userId, action: 'created', entityType: 'snippet', createdAt: { gte: weekStart } },
    }),
    prisma.activityLog.count({
      where: { userId, action: 'created', entityType: 'note', createdAt: { gte: weekStart } },
    }),
    prisma.activityLog.count({
      where: { userId, action: 'created', entityType: 'bookmark', createdAt: { gte: weekStart } },
    }),
    // Activity count per day to find most productive day
    prisma.activityLog.groupBy({
      by: ['createdAt'],
      where: { userId, createdAt: { gte: weekStart } },
      _count: { id: true },
    }),
  ])

  // Find most productive day
  const dayMap: Record<string, number> = {}
  activityByDay.forEach(entry => {
    const day = new Date(entry.createdAt).toLocaleDateString('en-US', { weekday: 'long' })
    dayMap[day] = (dayMap[day] ?? 0) + entry._count.id
  })
  const mostProductiveDay = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A'

  const stats = {
    tasksCompleted,
    tasksCreated,
    snippetsSaved,
    notesSaved,
    bookmarksSaved,
    completionRate: tasksCreated > 0 ? Math.round((tasksCompleted / tasksCreated) * 100) : 0,
    mostProductiveDay,
  }

  // Send stats to Gemini for narrative
  const prompt = `Generate an encouraging weekly recap for a developer. Be honest but motivating.
Include one actionable productivity tip at the end.
Keep it under 150 words. Use emoji. Casual tone.

Stats this week:
- Tasks completed: ${stats.tasksCompleted}
- Tasks created: ${stats.tasksCreated}  
- Completion rate: ${stats.completionRate}%
- Snippets saved: ${stats.snippetsSaved}
- Notes saved: ${stats.notesSaved}
- Bookmarks saved: ${stats.bookmarksSaved}
- Most productive day: ${stats.mostProductiveDay}

Respond in plain text with asterisks for bold. No markdown headers.`

  const result = await model.generateContent(prompt)
  const content = result.response.text().trim()

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
  const weekLabel = `${weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
  const message = `📊 *Weekly Recap*\n_${weekLabel}_\n\n${content}`
  await sendMessage(telegramId, message)

  console.log(`Weekly recap delivered to ${telegramId}`)
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
  // Daily standup — 10:00 AM IST = 04:30 UTC
  await standupQueue.add(
    'standup-daily',
    { type: 'standup-daily' },
    {
      repeat: { pattern: '30 4 * * *' }, // cron: 04:30 UTC = 10:00 AM IST
      jobId: 'standup-daily-cron',
    }
  )

  // Weekly recap — Monday 8:00 AM IST = Monday 02:30 UTC
  await standupQueue.add(
    'recap-weekly',
    { type: 'recap-weekly' },
    {
      repeat: { pattern: '30 2 * * 1' }, // cron: Monday 02:30 UTC = Monday 8:00 AM IST
      jobId: 'recap-weekly-cron',
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

  console.log('✅ Cron jobs registered: standup-daily, recap-weekly, overdue-scan')
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

      if (type === 'standup-daily') {
        // Fetch all users with telegramId
        const users = await prisma.user.findMany({
          select: { id: true, telegramId: true },
        })

        // Run in parallel — Promise.allSettled so one failure doesn't block others
        await Promise.allSettled(
          users.map(user =>
            generateStandup(user.id, user.telegramId, sendMessage)
          )
        )

      } else if (type === 'recap-weekly') {
        const users = await prisma.user.findMany({
          select: { id: true, telegramId: true },
        })

        await Promise.allSettled(
          users.map(user =>
            generateWeeklyRecap(user.id, user.telegramId, sendMessage)
          )
        )

      } else if (type === 'overdue-scan') {
        await scanOverdueTasks(reminderQueueInstance)
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