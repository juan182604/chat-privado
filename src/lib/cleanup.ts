import { query, execute, transaction } from '@/lib/db-client'
import { deleteFile } from '@/lib/storage'

/**
 * Cleanup operations — runs on every API call to keep the system tidy.
 *
 * 1. Mark photos as photoExpired=true when their custom self-destruct timer
 *    has elapsed (timer starts when receiver opens chat).
 *
 * 2. DELETE messages whose expiresAt has passed (> 10h since sent if unread,
 *    or > 10h since read). Also deletes associated media files from R2/disk.
 *    This permanently removes the messages from the database, freeing space.
 *    Only users, friendships, sessions, and audit logs are preserved.
 *
 * This function is idempotent and safe to call repeatedly.
 */
export async function cleanupExpiredMessages(): Promise<number> {
  const now = new Date().toISOString()

  // --- Operation 1: Mark expired photos AND delete their media files from R2 ---
  // When the self-destruct timer expires (photoViewStartedAt + photoExpiresSeconds),
  // we mark the photo as expired (photoExpired = 1) so it disappears from all chats,
  // AND we immediately delete the media file from R2/disk for true self-destruct.
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

  // --- Operation 2: DELETE messages past the 10-hour rule ---
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
 * Mark messages as read and recompute their expiry to be readAt + 10h.
 * Also starts the photo self-destruct timer for photo messages with a custom
 * timer that haven't started yet.
 */
export async function markConversationRead(
  ownerUniqueId: string,
  peerUniqueId: string,
): Promise<string[]> {
  const now = new Date()
  const newExpiry = new Date(now.getTime() + 10 * 60 * 60 * 1000).toISOString()

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

  // 2. Start photo self-destruct timer
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
