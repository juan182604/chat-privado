import { query, execute, transaction } from '@/lib/db-client'
import { deleteFile } from '@/lib/storage'
import { getAppSettings } from '@/lib/settings'

/**
 * Cleanup operations — runs on every API call to keep the system tidy.
 *
 * 1. ALWAYS: Mark photos as photoExpired=true when their custom self-destruct
 *    timer has elapsed (timer starts when receiver opens chat).
 *    Photo self-destruct is INDEPENDENT of the global auto-delete setting —
 *    photos with a timer ALWAYS self-destruct when their timer expires.
 *
 * 2. ONLY IF ADMIN ENABLED AUTO-DELETE: Delete messages whose expiresAt has
 *    passed (autoDeleteHours since sent/read). Also deletes media from R2.
 *    When auto-delete is OFF (default), messages are PERMANENT until admin
 *    manually deletes them.
 *
 * This function is idempotent and safe to call repeatedly.
 */
export async function cleanupExpiredMessages(): Promise<number> {
  const now = new Date().toISOString()

  // --- Operation 1: ALWAYS expire photos with self-destruct timer ---
  // This is independent of the global auto-delete setting.
  const photosToExpire = await query(
    `SELECT id, "mediaPath", "photoViewStartedAt", "photoExpiresSeconds" FROM "Message"
     WHERE type = 'photo'
       AND "photoExpiresSeconds" IS NOT NULL
       AND "photoViewStartedAt" IS NOT NULL
       AND "photoExpired" = 0`,
  )
  const expiredPhotoIds: string[] = []
  const expiredMediaPaths: string[] = []
  for (const m of photosToExpire) {
    if (!m.photoViewStartedAt || !m.photoExpiresSeconds) continue
    const expiresAtMs = new Date(m.photoViewStartedAt).getTime() + m.photoExpiresSeconds * 1000
    if (expiresAtMs < Date.now()) {
      expiredPhotoIds.push(m.id)
      if (m.mediaPath) expiredMediaPaths.push(m.mediaPath)
    }
  }
  if (expiredPhotoIds.length > 0) {
    // 🔥 Delete media files from R2/disk immediately (true self-destruct)
    await Promise.all(
      expiredMediaPaths.map(async (path) => {
        try {
          await deleteFile(path)
        } catch {
          // ignore missing files
        }
      }),
    )
    // Mark photos as expired in batches
    for (let i = 0; i < expiredPhotoIds.length; i += 50) {
      const batch = expiredPhotoIds.slice(i, i + 50)
      const placeholders = batch.map(() => '?').join(',')
      await execute(
        `UPDATE "Message" SET "photoExpired" = 1 WHERE id IN (${placeholders})`,
        batch,
      )
    }
  }

  // --- Operation 2: Auto-delete old messages (ONLY if admin enabled it) ---
  const settings = await getAppSettings().catch(() => ({ autoDeleteEnabled: false, autoDeleteHours: 10 }))
  if (!settings.autoDeleteEnabled) {
    // Auto-delete is OFF — messages are PERMANENT. Do nothing.
    return 0
  }

  // Auto-delete is ON — delete messages whose expiresAt has passed
  const expired = await query(
    `SELECT id, "mediaPath" FROM "Message" WHERE "expiresAt" < ?`,
    [now],
  )
  if (expired.length === 0) return 0

  // Best-effort delete media files (R2 or local disk)
  await Promise.all(
    expired.map(async (m) => {
      if (!m.mediaPath) return
      try {
        await deleteFile(m.mediaPath)
      } catch {
        // ignore missing files
      }
    }),
  )

  // Delete messages in batches
  const ids = expired.map((m) => m.id)
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50)
    const placeholders = batch.map(() => '?').join(',')
    await execute(
      `DELETE FROM "Message" WHERE id IN (${placeholders})`,
      batch,
    )
  }

  return expired.length
}

/**
 * Mark messages as read.
 * If auto-delete is enabled, recompute expiry to be readAt + autoDeleteHours.
 * If auto-delete is disabled, set a far-future expiry (effectively permanent).
 * Also starts the photo self-destruct timer for photo messages with a custom
 * timer that haven't started yet.
 */
export async function markConversationRead(
  ownerUniqueId: string,
  peerUniqueId: string,
): Promise<string[]> {
  const now = new Date()
  const settings = await getAppSettings().catch(() => ({ autoDeleteEnabled: false, autoDeleteHours: 10 }))
  // If auto-delete is OFF, use a far-future date (year 2099) so messages never expire
  const newExpiry = settings.autoDeleteEnabled
    ? new Date(now.getTime() + settings.autoDeleteHours * 60 * 60 * 1000).toISOString()
    : '2099-12-31T23:59:59.999Z'

  // Find owner and peer
  const owners = await query(`SELECT id FROM "User" WHERE "uniqueId" = ?`, [ownerUniqueId])
  const peers = await query(`SELECT id FROM "User" WHERE "uniqueId" = ?`, [peerUniqueId])
  if (owners.length === 0 || peers.length === 0) return []
  const ownerId = owners[0].id
  const peerId = peers[0].id

  // 1. Mark unread messages as read
  const unread = await query(
    `SELECT id FROM "Message"
     WHERE "receiverId" = ? AND "senderId" = ? AND "readAt" IS NULL AND "expiresAt" > ?`,
    [ownerId, peerId, now.toISOString()],
  )
  if (unread.length > 0) {
    const ids = unread.map((m: any) => m.id)
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50)
      const placeholders = batch.map(() => '?').join(',')
      await execute(
        `UPDATE "Message" SET "readAt" = ?, "expiresAt" = ? WHERE id IN (${placeholders})`,
        [now.toISOString(), newExpiry, ...batch],
      )
    }
  }

  // 2. Start photo self-destruct timer (always, regardless of auto-delete setting)
  const photosPending = await query(
    `SELECT id FROM "Message"
     WHERE "receiverId" = ? AND "senderId" = ? AND type = 'photo'
       AND "photoExpiresSeconds" IS NOT NULL
       AND "photoViewStartedAt" IS NULL
       AND "photoExpired" = 0
       AND "expiresAt" > ?`,
    [ownerId, peerId, now.toISOString()],
  )
  if (photosPending.length > 0) {
    const ids = photosPending.map((m: any) => m.id)
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50)
      const placeholders = batch.map(() => '?').join(',')
      await execute(
        `UPDATE "Message" SET "photoViewStartedAt" = ? WHERE id IN (${placeholders})`,
        [now.toISOString(), ...batch],
      )
    }
  }

  return unread.map((m: any) => m.id)
}
