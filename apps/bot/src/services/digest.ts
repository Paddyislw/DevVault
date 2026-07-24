// Digest (daily standup / weekly recap) settings, stored in User.aiSettings.digest.
// Keep in sync with apps/web/src/lib/digest.ts — same shape, same defaults.

export type DigestSettings = {
  standupEnabled: boolean
  standupTime: string // "HH:mm" 24h, in the user's timezone
  standupWorkspaceIds: string[] // [] = all workspaces
  recapEnabled: boolean
  recapDay: number // 0 = Sunday … 6 = Saturday
  recapTime: string // "HH:mm" 24h, in the user's timezone
  recapWorkspaceIds: string[] // [] = all workspaces
  remainingEnabled: boolean // "Remaining Tasks" — yesterday's unfinished, by workspace
  remainingTime: string
  remainingWorkspaceIds: string[] // [] = all workspaces
  timezone: string // IANA timezone name
}

export const DEFAULT_DIGEST_SETTINGS: DigestSettings = {
  standupEnabled: true,
  standupTime: '10:00',
  standupWorkspaceIds: [],
  recapEnabled: true,
  recapDay: 1, // Monday
  recapTime: '08:00',
  recapWorkspaceIds: [],
  remainingEnabled: true,
  remainingTime: '09:00',
  remainingWorkspaceIds: [],
  timezone: 'Asia/Kolkata',
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function idArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

/** Merges the raw aiSettings JSON with defaults, dropping invalid values. */
export function parseDigestSettings(aiSettings: unknown): DigestSettings {
  const root =
    aiSettings && typeof aiSettings === 'object' && !Array.isArray(aiSettings)
      ? (aiSettings as Record<string, unknown>)
      : {}
  const raw =
    root.digest && typeof root.digest === 'object' && !Array.isArray(root.digest)
      ? (root.digest as Record<string, unknown>)
      : {}

  const d = DEFAULT_DIGEST_SETTINGS
  return {
    standupEnabled: typeof raw.standupEnabled === 'boolean' ? raw.standupEnabled : d.standupEnabled,
    standupTime: typeof raw.standupTime === 'string' && TIME_RE.test(raw.standupTime) ? raw.standupTime : d.standupTime,
    standupWorkspaceIds: idArray(raw.standupWorkspaceIds),
    recapEnabled: typeof raw.recapEnabled === 'boolean' ? raw.recapEnabled : d.recapEnabled,
    recapDay:
      typeof raw.recapDay === 'number' && Number.isInteger(raw.recapDay) && raw.recapDay >= 0 && raw.recapDay <= 6
        ? raw.recapDay
        : d.recapDay,
    recapTime: typeof raw.recapTime === 'string' && TIME_RE.test(raw.recapTime) ? raw.recapTime : d.recapTime,
    recapWorkspaceIds: idArray(raw.recapWorkspaceIds),
    remainingEnabled: typeof raw.remainingEnabled === 'boolean' ? raw.remainingEnabled : d.remainingEnabled,
    remainingTime: typeof raw.remainingTime === 'string' && TIME_RE.test(raw.remainingTime) ? raw.remainingTime : d.remainingTime,
    remainingWorkspaceIds: idArray(raw.remainingWorkspaceIds),
    timezone: typeof raw.timezone === 'string' && raw.timezone.length > 0 ? raw.timezone : d.timezone,
  }
}

// ─── Timezone helpers ─────────────────────────────────────────────────────────

export type LocalTime = {
  year: number
  month: number // 1-12
  day: number
  weekday: number // 0 = Sunday … 6 = Saturday
  hour: number
  minute: number
  second: number
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Wall-clock time in the given IANA timezone for the given instant. */
export function getLocalTime(timezone: string, date: Date = new Date()): LocalTime {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value ?? '0'

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    weekday: WEEKDAYS.indexOf(get('weekday')),
    // Some engines format midnight as "24"
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
    second: Number(get('second')),
  }
}

/**
 * True when the local time falls in the same scheduling slot as the configured
 * "HH:mm". The digest scan cron runs every `slotMinutes`, so each configured
 * time matches exactly one scan per day.
 */
export function isInSlot(configured: string, local: LocalTime, slotMinutes = 15): boolean {
  const [h, m] = configured.split(':').map(Number)
  return local.hour === h && Math.floor(local.minute / slotMinutes) === Math.floor(m / slotMinutes)
}

export type LocalDayBounds = {
  /** Instant of local midnight today */
  todayStart: Date
  /** Instant of the last millisecond of today, local */
  todayEnd: Date
  yesterdayStart: Date
  yesterdayEnd: Date
  /** Instant of local midnight 7 days ago */
  weekStart: Date
  /** The local calendar date as a UTC-midnight Date — stable key for Standup.date */
  dateKey: Date
}

const DAY_MS = 86_400_000

/** Day boundaries as UTC instants, aligned to the user's local calendar. */
export function getLocalDayBounds(timezone: string, now: Date = new Date()): LocalDayBounds {
  const local = getLocalTime(timezone, now)

  // Offset between the wall clock and UTC, recovered by re-interpreting the
  // local wall-clock reading as UTC. Rounded to a minute to absorb ms drift.
  const localAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second)
  const offsetMs = Math.round((localAsUtc - now.getTime()) / 60_000) * 60_000

  const todayStartMs = Date.UTC(local.year, local.month - 1, local.day) - offsetMs

  return {
    todayStart: new Date(todayStartMs),
    todayEnd: new Date(todayStartMs + DAY_MS - 1),
    yesterdayStart: new Date(todayStartMs - DAY_MS),
    yesterdayEnd: new Date(todayStartMs - 1),
    weekStart: new Date(todayStartMs - 7 * DAY_MS),
    dateKey: new Date(Date.UTC(local.year, local.month - 1, local.day)),
  }
}
