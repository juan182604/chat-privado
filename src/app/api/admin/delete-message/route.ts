import { NextRequest, NextResponse } from 'next/server'
import { query, execute } from '@/lib/db-client'
import { getSession } from '@/lib/session'
import { deleteFile } from '@/lib/storage'
import { cleanupExpiredMessages } from '@/lib/cleanup'
import { jsonResponseNoCache } from '@/lib/no-cache'

/**
 * POST /api/admin/delete-message
 * Body: { messageId: string }
 *
 * Deletes a single message immediately (bypasses the 10-hour rule).
 * Also deletes the associated media file (photo/voice) from R2.
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
  const messageId = (body.messageId ?? '').toString()
  if (!messageId) {
    return jsonResponseNoCache({ error: 'Falta messageId' }, { status: 400 })
  }

  // Get the message to find its mediaPath
  const rows = await query(`SELECT * FROM "Message" WHERE id = ?`, [messageId])
  if (rows.length === 0) {
    return jsonResponseNoCache({ error: 'Mensaje no encontrado' }, { status: 404 })
  }
  const message = rows[0]

  // Delete the media file from R2 if it has one
  if (message.mediaPath) {
    try {
      await deleteFile(message.mediaPath)
    } catch {}
  }

  // Delete the message from the database
  await execute(`DELETE FROM "Message" WHERE id = ?`, [messageId])

  // Log the action
  const { generateId } = await import('@/lib/db-client')
  const auditId = generateId()
  const now = new Date().toISOString()
  await execute(
    `INSERT INTO "AuditLog" (id, "actorId", "targetUserId", action, reason, "createdAt") VALUES (?, ?, ?, ?, ?, ?)`,
    [auditId, session.user.id, message.senderId, 'delete_message', `Admin eliminó mensaje ${messageId} (${message.type})`, now],
  )

  // Run cleanup opportunistically
  await cleanupExpiredMessages().catch(() => {})

  return jsonResponseNoCache({ ok: true })
}
