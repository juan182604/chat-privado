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

  const aId = req.nextUrl.searchParams.get('aUniqueId')?.trim().toLowerCase() ?? ''
  const bId = req.nextUrl.searchParams.get('bUniqueId')?.trim().toLowerCase() ?? ''
  if (!/^[a-z0-9]{6}$/.test(aId) || !/^[a-z0-9]{6}$/.test(bId)) {
    return jsonResponseNoCache({ error: 'IDs inválidos' }, { status: 400 })
  }
  const aRows = await query(`SELECT * FROM "User" WHERE "uniqueId" = ?`, [aId])
  const bRows = await query(`SELECT * FROM "User" WHERE "uniqueId" = ?`, [bId])
  if (aRows.length === 0 || bRows.length === 0) {
    return jsonResponseNoCache({ error: 'Usuario no encontrado' }, { status: 404 })
  }
  const a = aRows[0]
  const b = bRows[0]

  // PERMISSION CHECK:
  // - super_admin can see ALL conversations
  // - regular admin CANNOT see conversations where either party is an admin
  const isSuperAdmin = session.user.role === 'super_admin'
  if (!isSuperAdmin && (a.role === 'admin' || a.role === 'super_admin' || b.role === 'admin' || b.role === 'super_admin')) {
    return jsonResponseNoCache({
      error: 'No tienes permiso para ver conversaciones que involucran a otros admins. Solo el super admin puede verlas.',
      a: { uniqueId: a.uniqueId, username: a.username, firstName: a.firstName, lastName: a.lastName, role: a.role },
      b: { uniqueId: b.uniqueId, username: b.username, firstName: b.firstName, lastName: b.lastName, role: b.role },
      messages: [],
    })
  }

  // Get ALL messages including expired photos (admin can see history)
  const messages = await query(
    `SELECT * FROM "Message"
     WHERE (
       ("senderId" = ? AND "receiverId" = ?) OR
       ("senderId" = ? AND "receiverId" = ?)
     )
     ORDER BY "sentAt" ASC LIMIT 500`,
    [a.id, b.id, b.id, a.id],
  )

  return jsonResponseNoCache({
    a: { uniqueId: a.uniqueId, username: a.username, firstName: a.firstName, lastName: a.lastName },
    b: { uniqueId: b.uniqueId, username: b.username, firstName: b.firstName, lastName: b.lastName },
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
      fromA: m.senderId === a.id,
      photoExpiresSeconds: m.photoExpiresSeconds,
      photoViewStartedAt: m.photoViewStartedAt,
      photoExpired: !!m.photoExpired,
    })),
  })
}
