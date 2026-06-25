import { NextResponse } from 'next/server'
import { query } from '@/lib/db-client'
import { getSession } from '@/lib/session'
import { jsonResponseNoCache } from '@/lib/no-cache'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return jsonResponseNoCache({ error: 'No autenticado' }, { status: 401 })
  }
  const rows = await query(
    `SELECT u."uniqueId", u.username, u."firstName", u."lastName", u."displayName", u.blocked
     FROM "Friendship" f
     JOIN "User" u ON f."friendId" = u.id
     WHERE f."userId" = ?`,
    [session.user.id],
  )
  return jsonResponseNoCache({
    friends: rows.map((r: any) => ({
      uniqueId: r.uniqueId,
      username: r.username,
      firstName: r.firstName,
      lastName: r.lastName,
      displayName: r.displayName || null,
      blocked: !!r.blocked,
    })),
  })
}
