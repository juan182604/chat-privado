import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db-client'
import { getSession } from '@/lib/session'
import { cleanupExpiredMessages, markConversationRead } from '@/lib/cleanup'
import { jsonResponseNoCache } from '@/lib/no-cache'

/**
 * Polling endpoint for real-time updates.
 * GET /api/messages/poll?since=<ISO_DATE>
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return jsonResponseNoCache({ error: 'No autenticado' }, { status: 401 })
  }

  await cleanupExpiredMessages().catch(() => {})

  const sinceParam = req.nextUrl.searchParams.get('since')
  const since = sinceParam ? new Date(sinceParam) : new Date(0)
  if (isNaN(since.getTime())) {
    return jsonResponseNoCache({ error: 'since inválido' }, { status: 400 })
  }

  // Friends list
  const friendships = await query(
    `SELECT f."friendId", u."uniqueId", u.username, u."firstName", u."lastName", u."displayName", u.blocked
     FROM "Friendship" f
     JOIN "User" u ON f."friendId" = u.id
     WHERE f."userId" = ?`,
    [session.user.id],
  )

  // Build chats list with last message + unread count
  const chats = await Promise.all(
    friendships.map(async (f: any) => {
      const lastRows = await query(
        `SELECT * FROM "Message"
         WHERE "photoExpired" = 0 AND (
           ("senderId" = ? AND "receiverId" = ?) OR
           ("senderId" = ? AND "receiverId" = ?)
         )
         ORDER BY "sentAt" DESC LIMIT 1`,
        [session.user.id, f.friendId, f.friendId, session.user.id],
      )
      const last = lastRows[0]
      const unreadRows = await query(
        `SELECT COUNT(*) as count FROM "Message"
         WHERE "senderId" = ? AND "receiverId" = ? AND "readAt" IS NULL AND "photoExpired" = 0`,
        [f.friendId, session.user.id],
      )
      return {
        peer: {
          uniqueId: f.uniqueId,
          username: f.username,
          firstName: f.firstName,
          lastName: f.lastName, displayName: f.displayName || null,
          blocked: !!f.blocked,
        },
        lastMessage: last
          ? {
              type: last.type,
              content: last.content,
              sentAt: last.sentAt,
              fromMe: last.senderId === session.user.id,
              callKind: last.callKind,
              callStatus: last.callStatus,
            }
          : null,
        unread: unreadRows[0].count,
      }
    }),
  )

  chats.sort((a, b) => {
    const ta = a.lastMessage ? new Date(a.lastMessage.sentAt).getTime() : 0
    const tb = b.lastMessage ? new Date(b.lastMessage.sentAt).getTime() : 0
    return tb - ta
  })

  // New messages since `since`
  const newMessagesRaw = await query(
    `SELECT * FROM "Message"
     WHERE "photoExpired" = 0 AND "sentAt" > ? AND (
       "senderId" = ? OR "receiverId" = ?
     )
     ORDER BY "sentAt" ASC LIMIT 200`,
    [since.toISOString(), session.user.id, session.user.id],
  )

  const friendMap = new Map(friendships.map((f: any) => [f.friendId, f]))

  const newMessages = newMessagesRaw
    .map((m: any) => {
      const fromMe = m.senderId === session.user.id
      const peerId = fromMe ? m.receiverId : m.senderId
      const friend = friendMap.get(peerId)
      if (!friend) return null
      return {
        id: m.id,
        peerUniqueId: friend.uniqueId,
        type: m.type,
        content: m.content,
        mediaPath: m.mediaPath,
        callKind: m.callKind,
        callDuration: m.callDuration,
        callStatus: m.callStatus,
        sentAt: m.sentAt,
        photoExpiresSeconds: m.photoExpiresSeconds,
        photoViewStartedAt: m.photoViewStartedAt,
        readAt: m.readAt,
        fromMe,
      }
    })
    .filter((m) => m !== null)

  return jsonResponseNoCache({
    chats,
    newMessages,
    serverTime: new Date().toISOString(),
    serverNow: Date.now(),
  })
}
