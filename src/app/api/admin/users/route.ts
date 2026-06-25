import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db-client'
import { getSession } from '@/lib/session'
import { cleanupExpiredMessages } from '@/lib/cleanup'
import { jsonResponseNoCache } from '@/lib/no-cache'

async function requireAdmin() {
  const session = await getSession()
  if (!session) return null
  if (session.user.role !== 'admin' && session.user.role !== 'super_admin') return null
  if (session.user.blocked) return null
  return session
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return jsonResponseNoCache({ error: 'Acceso denegado' }, { status: 403 })
  await cleanupExpiredMessages().catch(() => {})

  const q = req.nextUrl.searchParams.get('q')?.trim().toLowerCase()
  const role = req.nextUrl.searchParams.get('role')
  const blockedOnly = req.nextUrl.searchParams.get('blocked') === '1'

  let sql = `SELECT id, "uniqueId", username, "firstName", "lastName", role, blocked, "blockReason", "blockedAt", "createdAt" FROM "User"`
  const conditions: string[] = []
  const args: any[] = []
  if (q) {
    conditions.push(`(username LIKE ? OR "uniqueId" LIKE ? OR "firstName" LIKE ? OR "lastName" LIKE ?)`)
    args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
  }
  if (role) {
    conditions.push(`role = ?`)
    args.push(role)
  }
  if (blockedOnly) {
    conditions.push(`blocked = 1`)
  }
  if (conditions.length > 0) {
    sql += ` WHERE ` + conditions.join(' AND ')
  }
  sql += ` ORDER BY "createdAt" DESC`

  const users = await query(sql, args)
  return jsonResponseNoCache({
    users: users.map((u: any) => ({ ...u, blocked: !!u.blocked })),
    viewerRole: session.user.role,
    viewerId: session.user.id,
  })
}
