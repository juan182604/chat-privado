import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db-client'
import { getSession } from '@/lib/session'
import { cleanupExpiredMessages } from '@/lib/cleanup'
import { jsonResponseNoCache } from '@/lib/no-cache'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return jsonResponseNoCache({ error: 'No autenticado' }, { status: 401 })
  if (session.user.role !== 'admin' && session.user.role !== 'super_admin') {
    return jsonResponseNoCache({ error: 'Acceso denegado' }, { status: 403 })
  }
  await cleanupExpiredMessages().catch(() => {})

  const uniqueId = req.nextUrl.searchParams.get('uniqueId')?.trim().toLowerCase() ?? ''
  if (!/^[a-z0-9]{6}$/.test(uniqueId)) {
    return jsonResponseNoCache({ error: 'ID inválido' }, { status: 400 })
  }

  const userRows = await query(`SELECT * FROM "User" WHERE "uniqueId" = ?`, [uniqueId])
  if (userRows.length === 0) {
    return jsonResponseNoCache({ error: 'Usuario no encontrado' }, { status: 404 })
  }
  const user = userRows[0]

  // Find peers with active messages
  const sentPeers = await query(
    `SELECT DISTINCT "receiverId" as peerId FROM "Message" WHERE "senderId" = ? AND "expiresAt" > ?`,
    [user.id, new Date().toISOString()],
  )
  const receivedPeers = await query(
    `SELECT DISTINCT "senderId" as peerId FROM "Message" WHERE "receiverId" = ? AND "expiresAt" > ?`,
    [user.id, new Date().toISOString()],
  )
  const peerIds = new Set<string>([
    ...sentPeers.map((p: any) => p.peerId),
    ...receivedPeers.map((p: any) => p.peerId),
  ])

  const conversations = []
  for (const peerId of Array.from(peerIds)) {
    const peerRows = await query(
      `SELECT "uniqueId", username, "firstName", "lastName", blocked FROM "User" WHERE id = ?`,
      [peerId],
    )
    if (peerRows.length === 0) continue
    const peer = peerRows[0]
    const messages = await query(
      `SELECT * FROM "Message"
       WHERE "expiresAt" > ? AND (
         ("senderId" = ? AND "receiverId" = ?) OR
         ("senderId" = ? AND "receiverId" = ?)
       )
       ORDER BY "sentAt" ASC LIMIT 500`,
      [new Date().toISOString(), user.id, peerId, peerId, user.id],
    )
    conversations.push({
      peer: { ...peer, blocked: !!peer.blocked },
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
        fromUser: m.senderId === user.id,
        photoExpiresSeconds: m.photoExpiresSeconds,
        photoViewStartedAt: m.photoViewStartedAt,
        photoExpired: !!m.photoExpired,
      })),
    })
  }

  // Sort by most recent message
  conversations.sort((a, b) => {
    const aLast = a.messages[a.messages.length - 1]
    const bLast = b.messages[b.messages.length - 1]
    const ta = aLast ? new Date(aLast.sentAt).getTime() : 0
    const tb = bLast ? new Date(bLast.sentAt).getTime() : 0
    return tb - ta
  })

  return jsonResponseNoCache({
    user: {
      id: user.id,
      uniqueId: user.uniqueId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      blocked: !!user.blocked,
    },
    conversations,
    serverTime: new Date().toISOString(),
  })
}
