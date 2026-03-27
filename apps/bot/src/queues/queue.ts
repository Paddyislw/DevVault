import { Queue } from 'bullmq'
import { redisConnection } from './connection'

export const reminderQueue = new Queue('reminders', { connection: redisConnection })
export const standupQueue = new Queue('standups', { connection: redisConnection })