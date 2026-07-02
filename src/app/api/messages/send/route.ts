import { NextRequest, NextResponse } from 'next/server'
import { query, execute, generateId } from '@/lib/db-client'
import { getSession } from '@/lib/session'
import { plus10Hours } from '@/lib/auth-utils'
import { cleanupExpiredMessages } from '@/lib/cleanup'
import { jsonResponseNoCache } from '@/lib/no-cache'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return jsonResponseNoCache({ error: 'No autenticado' }, { status: 401 })
  }
  await cleanupExpiredMessages().catch(() => {})

  const body = await req.json().catch(() => null)
  if (!body) return jsonResponseNoCache({ error: 'JSON inválido' }, { status: 400 })

  const toUniqueId = (body.toUniqueId ?? '').toString().trim().toLowerCase()
  const type = (body.type ?? '').toString()
  if (!/^[a-z0-9]{6}$/.test(toUniqueId)) {
    return jsonResponseNoCache({ error: 'ID destinatario inválido' }, { status: 400 })
  }
  if (!['text', 'voice', 'photo', 'call'].includes(type)) {
    return jsonResponseNoCache({ error: 'Tipo de mensaje inválido' }, { status: 400 })
  }

  const receiverRows = await query(`SELECT id FROM "User" WHERE "uniqueId" = ?`, [toUniqueId])
  if (receiverRows.length === 0) {
    return jsonResponseNoCache({ error: 'Destinatario no encontrado' }, { status: 404 })
  }
  const receiverId = receiverRows[0].id

  const friendRows = await query(
    `SELECT id FROM "Friendship" WHERE "userId" = ? AND "friendId" = ?`,
    [session.user.id, receiverId],
  )
  if (friendRows.length === 0) {
    return jsonResponseNoCache({ error: 'Solo puedes escribir a tus contactos' }, { status: 403 })
  }

  const sentAt = new Date()
  const content = body.content ?? null
  const mediaPath = body.mediaPath ?? null
  const callKind = body.callKind ?? null
  const callDuration = typeof body.callDuration === 'number' ? body.callDuration : null
  const callStatus = body.callStatus ?? 'completed'

  let photoExpiresSeconds: number | null = null
  if (type === 'photo' && body.photoExpiresSeconds != null) {
    const n = Number(body.photoExpiresSeconds)
    if (Number.isInteger(n) && n >= 1 && n <= 28800) {
      photoExpiresSeconds = n
    } else {
      return jsonResponseNoCache(
        { error: 'photoExpiresSeconds debe ser un entero entre 1 y 28800' },
        { status: 400 },
      )
    }
  }

  if (type === 'text' && !content) {
    return jsonResponseNoCache({ error: 'Mensaje vacío' }, { status: 400 })
  }
  if ((type === 'voice' || type === 'photo') && !mediaPath) {
    return jsonResponseNoCache({ error: 'Falta mediaPath' }, { status: 400 })
  }

  // El timer de auto-destrucción empieza cuando el RECEPTOR abra el chat (no al enviar).
  // photoViewStartedAt se establece en NULL aquí, y se actualiza cuando el receptor
  // abre el chat (ver markConversationRead en cleanup.ts).
  const id = generateId()
  await execute(
    `INSERT INTO "Message" (id, "senderId", "receiverId", type, content, "mediaPath", "callDuration", "callKind", "callStatus", "sentAt", "expiresAt", "photoExpiresSeconds", "photoViewStartedAt", "photoExpired")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0)`,
    [id, session.user.id, receiverId, type, content, mediaPath, callDuration, callKind, callStatus, sentAt.toISOString(), plus10Hours(sentAt).toISOString(), photoExpiresSeconds],
  )

  return jsonResponseNoCache({
    message: {
      id,
      type,
      content,
      mediaPath,
      callKind,
      callDuration,
      callStatus,
      sentAt: sentAt.toISOString(),
      fromUniqueId: session.user.uniqueId,
      toUniqueId,
      photoExpiresSeconds,
      photoViewStartedAt: null,
      photoExpired: false,
    },
  })
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return jsonResponseNoCache({ error: 'No autenticado' }, { status: 401 })
  }
  await cleanupExpiredMessages().catch(() => {})
  const peerUniqueId = req.nextUrl.searchParams.get('peerUniqueId')?.trim().toLowerCase() ?? ''
  if (!/^[a-z0-9]{6}$/.test(peerUniqueId)) {
    return jsonResponseNoCache({ error: 'ID peer inválido' }, { status: 400 })
  }
  const peerRows = await query(`SELECT * FROM "User" WHERE "uniqueId" = ?`, [peerUniqueId])
  if (peerRows.length === 0) {
    return jsonResponseNoCache({ error: 'Peer no encontrado' }, { status: 404 })
  }
  const peer = peerRows[0]

  const friendRows = await query(
    `SELECT id FROM "Friendship" WHERE "userId" = ? AND "friendId" = ?`,
    [session.user.id, peer.id],
  )
  if (friendRows.length === 0) {
    return jsonResponseNoCache({ error: 'No son contactos' }, { status: 403 })
  }

  const messages = await query(
    `SELECT * FROM "Message"
     WHERE "photoExpired" = 0 AND (
       ("senderId" = ? AND "receiverId" = ?) OR
       ("senderId" = ? AND "receiverId" = ?)
     )
     ORDER BY "sentAt" ASC LIMIT 500`,
    [session.user.id, peer.id, peer.id, session.user.id],
  )

  return jsonResponseNoCache({
    messages: messages.map((m: any) => ({
      id: m.id,
      type: m.type,
      content: m.content,
      mediaPath: m.mediaPath,
      callKind: m.callKind,
      callDuration: m.callDuration,
      callStatus: m.callStatus,
      sentAt: m.sentAt,
      readAt: m.readAt,
      fromMe: m.senderId === session.user.id,
      photoExpiresSeconds: m.photoExpiresSeconds,
      photoViewStartedAt: m.photoViewStartedAt,
    })),
    peer: {
      uniqueId: peer.uniqueId,
      username: peer.username,
      firstName: peer.firstName,
      lastName: peer.lastName,
      displayName: peer.displayName || null,
    },
  })
}
