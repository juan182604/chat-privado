import { NextRequest, NextResponse } from 'next/server'
import { query, execute, generateId } from '@/lib/db-client'
import { getSession } from '@/lib/session'
import { getAppSettings } from '@/lib/settings'
import { jsonResponseNoCache } from '@/lib/no-cache'

/**
 * POST /api/messages/screenshot
 * Body: { toUniqueId: string }
 *
 * Called when the client detects a possible screenshot (visibilitychange
 * or PrintScreen key). Creates a "screenshot" message that appears as a
 * system notification in the chat. The message auto-deletes after 5 seconds,
 * with the timer starting when the RECEIVER opens the conversation.
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return jsonResponseNoCache({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const toUniqueId = (body.toUniqueId ?? '').toString().trim().toLowerCase()
  if (!/^[a-z0-9]{6}$/.test(toUniqueId)) {
    return jsonResponseNoCache({ error: 'ID inválido' }, { status: 400 })
  }

  const receiverRows = await query(`SELECT id FROM "User" WHERE "uniqueId" = ?`, [toUniqueId])
  if (receiverRows.length === 0) {
    return jsonResponseNoCache({ error: 'Destinatario no encontrado' }, { status: 404 })
  }
  const receiverId = receiverRows[0].id

  // Verify they are friends
  const friendRows = await query(
    `SELECT id FROM "Friendship" WHERE "userId" = ? AND "friendId" = ?`,
    [session.user.id, receiverId],
  )
  if (friendRows.length === 0) {
    return jsonResponseNoCache({ error: 'Solo puedes escribir a tus contactos' }, { status: 403 })
  }

  const settings = await getAppSettings().catch(() => ({ autoDeleteEnabled: false, autoDeleteHours: 10 }))
  const expiresAt = settings.autoDeleteEnabled
    ? new Date(Date.now() + settings.autoDeleteHours * 60 * 60 * 1000).toISOString()
    : '2099-12-31T23:59:59.999Z'

  const senderName = session.user.displayName || session.user.firstName || session.user.username
  const id = generateId()
  const sentAt = new Date().toISOString()

  // Create a "screenshot" message — reuses the photo timer mechanism
  // photoExpiresSeconds = 5 (auto-delete after 5 seconds)
  // photoViewStartedAt = null (timer starts when receiver opens chat)
  await execute(
    `INSERT INTO "Message" (id, "senderId", "receiverId", type, content, "mediaPath", "callDuration", "callKind", "callStatus", "sentAt", "expiresAt", "photoExpiresSeconds", "photoViewStartedAt", "photoExpired")
     VALUES (?, ?, ?, 'screenshot', ?, NULL, NULL, NULL, NULL, ?, ?, 5, NULL, 0)`,
    [id, session.user.id, receiverId, `${senderName} hizo una captura de pantalla`, sentAt, expiresAt],
  )

  return jsonResponseNoCache({
    ok: true,
    message: {
      id,
      type: 'screenshot',
      content: `${senderName} hizo una captura de pantalla`,
      sentAt,
      photoExpiresSeconds: 5,
      photoViewStartedAt: null,
    },
  })
}
