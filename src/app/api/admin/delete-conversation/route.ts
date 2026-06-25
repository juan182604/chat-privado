import { NextRequest, NextResponse } from 'next/server'
import { query, execute, generateId } from '@/lib/db-client'
import { getSession } from '@/lib/session'
import { deleteFile } from '@/lib/storage'
import { cleanupExpiredMessages } from '@/lib/cleanup'
import { jsonResponseNoCache } from '@/lib/no-cache'

/**
 * POST /api/admin/delete-conversation
 * Body: { userUniqueId: string, peerUniqueId: string }
 *
 * Deletes ALL messages between two users immediately (bypasses the 10-hour rule).
 * Also deletes all associated media files (photos/voice) from R2.
 * Only admins can do this.
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return jsonResponseNoCache({ error: 'No autenticado' }, { status: 401 })
  }
  if (session.user.role !== 'admin' && session.user.role !== 'super_admin') {
    return jsonResponseNoCache({ error: 'Acceso denegado' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const userUniqueId = (body.userUniqueId ?? '').toString().trim().toLowerCase()
  const peerUniqueId = (body.peerUniqueId ?? '').toString().trim().toLowerCase()

  if (!/^[a-z0-9]{6}$/.test(userUniqueId) || !/^[a-z0-9]{6}$/.test(peerUniqueId)) {
    return jsonResponseNoCache({ error: 'IDs inválidos' }, { status: 400 })
  }

  // Find both users
  const userRows = await query(`SELECT id FROM "User" WHERE "uniqueId" = ?`, [userUniqueId])
  const peerRows = await query(`SELECT id FROM "User" WHERE "uniqueId" = ?`, [peerUniqueId])
  if (userRows.length === 0 || peerRows.length === 0) {
    return jsonResponseNoCache({ error: 'Usuario no encontrado' }, { status: 404 })
  }
  const userId = userRows[0].id
  const peerId = peerRows[0].id

  // Get all messages between them (to find media files)
  const messages = await query(
    `SELECT id, "mediaPath" FROM "Message"
     WHERE ("senderId" = ? AND "receiverId" = ?) OR ("senderId" = ? AND "receiverId" = ?)`,
    [userId, peerId, peerId, userId],
  )

  // Delete all media files from R2
  await Promise.all(
    messages.map(async (m: any) => {
      if (m.mediaPath) {
        try {
          await deleteFile(m.mediaPath)
        } catch {}
      }
    }),
  )

  // Delete all messages from the database
  const messageIds = messages.map((m: any) => m.id)
  let deletedCount = 0
  if (messageIds.length > 0) {
    // Delete in batches of 50
    for (let i = 0; i < messageIds.length; i += 50) {
      const batch = messageIds.slice(i, i + 50)
      const placeholders = batch.map(() => '?').join(',')
      const result = await execute(
        `DELETE FROM "Message" WHERE id IN (${placeholders})`,
        batch,
      )
      deletedCount += result.changes
    }
  }

  // Log the action
  const auditId = generateId()
  const now = new Date().toISOString()
  await execute(
    `INSERT INTO "AuditLog" (id, "actorId", "targetUserId", action, reason, "createdAt") VALUES (?, ?, ?, ?, ?, ?)`,
    [auditId, session.user.id, userId, 'delete_conversation', `Admin eliminó conversación ${userUniqueId} <-> ${peerUniqueId} (${deletedCount} mensajes)`, now],
  )

  // Run cleanup opportunistically
  await cleanupExpiredMessages().catch(() => {})

  return jsonResponseNoCache({ ok: true, deletedCount })
}
