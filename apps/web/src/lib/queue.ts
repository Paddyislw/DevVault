import { Queue } from 'bullmq'

const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
}

let _reminderQueue: Queue | null = null
let _standupQueue: Queue | null = null

export function getReminderQueue(): Queue {
  if (!_reminderQueue) {
    _reminderQueue = new Queue('reminders', { connection })
  }
  return _reminderQueue
}

export function getStandupQueue(): Queue {
  if (!_standupQueue) {
    _standupQueue = new Queue('standups', { connection })
  }
  return _standupQueue
}