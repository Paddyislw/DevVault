// Digest (daily standup / weekly recap) settings, stored in User.aiSettings.digest.
// Keep in sync with apps/bot/src/services/digest.ts — same shape, same defaults.

export type DigestSettings = {
  standupEnabled: boolean
  standupTime: string // "HH:mm" 24h, in the user's timezone
  recapEnabled: boolean
  recapDay: number // 0 = Sunday … 6 = Saturday
  recapTime: string // "HH:mm" 24h, in the user's timezone
  timezone: string // IANA timezone name
}

export const DEFAULT_DIGEST_SETTINGS: DigestSettings = {
  standupEnabled: true,
  standupTime: '10:00',
  recapEnabled: true,
  recapDay: 1, // Monday
  recapTime: '08:00',
  timezone: 'Asia/Kolkata',
}

export const DIGEST_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

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
    recapEnabled: typeof raw.recapEnabled === 'boolean' ? raw.recapEnabled : d.recapEnabled,
    recapDay:
      typeof raw.recapDay === 'number' && Number.isInteger(raw.recapDay) && raw.recapDay >= 0 && raw.recapDay <= 6
        ? raw.recapDay
        : d.recapDay,
    recapTime: typeof raw.recapTime === 'string' && DIGEST_TIME_RE.test(raw.recapTime) ? raw.recapTime : d.recapTime,
    timezone: typeof raw.timezone === 'string' && raw.timezone.length > 0 ? raw.timezone : d.timezone,
  }
}
