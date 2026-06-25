import { NextRequest, NextResponse } from 'next/server'
import { query, execute } from '@/lib/db-client'
import { getSession } from '@/lib/session'
import { jsonResponseNoCache } from '@/lib/no-cache'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return jsonResponseNoCache({ error: 'No autenticado' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const id = (body.targetUniqueId ?? '').toString().trim().toLowerCase()
  if (!/^[a-z0-9]{6}$/.test(id)) {
    return jsonResponseNoCache({ error: 'ID inválido' }, { status: 400 })
  }
  const targetRows = await query(`SELECT id FROM "User" WHERE "uniqueId" = ?`, [id])
  if (targetRows.length === 0) {
    return jsonResponseNoCache({ error: 'Usuario no encontrado' }, { status: 404 })
  }
  const targetId = targetRows[0].id
  await execute(`DELETE FROM "Friendship" WHERE "userId" = ? AND "friendId" = ?`, [session.user.id, targetId])
  await execute(`DELETE FROM "Friendship" WHERE "userId" = ? AND "friendId" = ?`, [targetId, session.user.id])
  return jsonResponseNoCache({ ok: true })
}
