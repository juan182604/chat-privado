import { NextResponse } from 'next/server'
import { query } from '@/lib/db-client'
import { getSession } from '@/lib/session'
import { jsonResponseNoCache } from '@/lib/no-cache'

export async function GET() {
  const session = await getSession()
  if (!session) return jsonResponseNoCache({ error: 'No autenticado' }, { status: 401 })
  if (session.user.role !== 'admin' && session.user.role !== 'super_admin') {
    return jsonResponseNoCache({ error: 'Acceso denegado' }, { status: 403 })
  }
  const logs = await query(
    `SELECT l.id, l.action, l.reason, l."createdAt", l."targetUserId",
            u.username, u."uniqueId"
     FROM "AuditLog" l
     LEFT JOIN "User" u ON l."actorId" = u.id
     ORDER BY l."createdAt" DESC LIMIT 200`,
  )
  return jsonResponseNoCache({
    logs: logs.map((l: any) => ({
      id: l.id,
      action: l.action,
      reason: l.reason,
      createdAt: l.createdAt,
      targetUserId: l.targetUserId,
      actor: l.username ? { username: l.username, uniqueId: l.uniqueId } : null,
    })),
  })
}
