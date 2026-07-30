import { query, execute } from '@/lib/db-client'

/**
 * Global app settings — controllable by admin.
 *
 * - autoDeleteEnabled: when true, messages auto-delete after autoDeleteHours
 * - autoDeleteHours: number of hours before messages auto-delete (default 10)
 *
 * When autoDeleteEnabled is false, messages are PERMANENT until admin deletes them.
 */

export interface AppSettings {
  autoDeleteEnabled: boolean
  autoDeleteHours: number
}

const DEFAULT_SETTINGS: AppSettings = {
  autoDeleteEnabled: false, // ← Messages are PERMANENT by default
  autoDeleteHours: 10,
}

/**
 * Initialize the Setting table and ensure default values exist.
 * Called lazily on first access.
 */
let initPromise: Promise<void> | null = null
async function ensureSettingsTable(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = (async () => {
    try {
      await execute(
        `CREATE TABLE IF NOT EXISTS "Setting" (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
      )
      // Seed defaults if missing
      const rows = await query(`SELECT key, value FROM "Setting" WHERE key IN ('autoDeleteEnabled', 'autoDeleteHours')`)
      const found = new Set(rows.map((r: any) => r.key))
      if (!found.has('autoDeleteEnabled')) {
        await execute(
          `INSERT INTO "Setting" (key, value) VALUES ('autoDeleteEnabled', ?)`,
          [DEFAULT_SETTINGS.autoDeleteEnabled ? 'true' : 'false'],
        )
      }
      if (!found.has('autoDeleteHours')) {
        await execute(
          `INSERT INTO "Setting" (key, value) VALUES ('autoDeleteHours', ?)`,
          [String(DEFAULT_SETTINGS.autoDeleteHours)],
        )
      }
    } catch (e) {
      // Reset initPromise so it can retry on next call
      initPromise = null
      throw e
    }
  })()
  return initPromise
}

/**
 * Get the current app settings.
 */
export async function getAppSettings(): Promise<AppSettings> {
  await ensureSettingsTable()
  try {
    const rows = await query(
      `SELECT key, value FROM "Setting" WHERE key IN ('autoDeleteEnabled', 'autoDeleteHours')`,
    )
    const map = new Map(rows.map((r: any) => [r.key, r.value]))
    return {
      autoDeleteEnabled: map.get('autoDeleteEnabled') === 'true',
      autoDeleteHours: parseInt(map.get('autoDeleteHours') || '10', 10),
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

/**
 * Update the auto-delete enabled flag.
 */
export async function setAutoDeleteEnabled(enabled: boolean): Promise<void> {
  await ensureSettingsTable()
  await execute(
    `INSERT INTO "Setting" (key, value) VALUES ('autoDeleteEnabled', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [enabled ? 'true' : 'false'],
  )
}

/**
 * Update the auto-delete hours value.
 */
export async function setAutoDeleteHours(hours: number): Promise<void> {
  await ensureSettingsTable()
  const h = Math.max(1, Math.min(720, Math.floor(hours))) // 1h to 720h (30 days)
  await execute(
    `INSERT INTO "Setting" (key, value) VALUES ('autoDeleteHours', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [String(h)],
  )
}
