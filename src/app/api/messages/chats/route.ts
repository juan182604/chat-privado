import { NextResponse } from 'next/server'
import { query } from '@/lib/db-client'
import { getSession } from '@/lib/session'
import { cleanupExpiredMessages } from '@/lib/cleanup'
import { jsonResponseNoCache } from '@/lib/no-cache'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return jsonResponseNoCache({ error: 'No autenticado' }, { status: 401 })
  }
  await cleanupExpiredMessages().catch(() => {})

  const friendships = await query(
    `SELECT f."friendId", u."uniqueId", u.username, u."firstName", u."lastName", u."displayName", u.blocked
     FROM "Friendship" f
     JOIN "User" u ON f."friendId" = u.id
     WHERE f."userId" = ?`,
    [session.user.id],
  )

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
         WHERE "senderId" = ? AND "receiverId" = ? AND "readAt" IS NULL`,
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

  return jsonResponseNoCache({ chats })
}
