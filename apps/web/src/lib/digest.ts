// Digest (daily standup / weekly recap / remaining tasks) settings, stored in
// User.aiSettings.digest.
// Keep in sync with apps/bot/src/services/digest.ts — same shape, same defaults.

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

export const DIGEST_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

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
    standupTime:
      typeof raw.standupTime === 'string' && DIGEST_TIME_RE.test(raw.standupTime) ? raw.standupTime : d.standupTime,
    standupWorkspaceIds: idArray(raw.standupWorkspaceIds),
    recapEnabled: typeof raw.recapEnabled === 'boolean' ? raw.recapEnabled : d.recapEnabled,
    recapDay:
      typeof raw.recapDay === 'number' && Number.isInteger(raw.recapDay) && raw.recapDay >= 0 && raw.recapDay <= 6
        ? raw.recapDay
        : d.recapDay,
    recapTime: typeof raw.recapTime === 'string' && DIGEST_TIME_RE.test(raw.recapTime) ? raw.recapTime : d.recapTime,
    recapWorkspaceIds: idArray(raw.recapWorkspaceIds),
    remainingEnabled: typeof raw.remainingEnabled === 'boolean' ? raw.remainingEnabled : d.remainingEnabled,
    remainingTime:
      typeof raw.remainingTime === 'string' && DIGEST_TIME_RE.test(raw.remainingTime) ? raw.remainingTime : d.remainingTime,
    remainingWorkspaceIds: idArray(raw.remainingWorkspaceIds),
    timezone: typeof raw.timezone === 'string' && raw.timezone.length > 0 ? raw.timezone : d.timezone,
  }
}
