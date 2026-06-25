import { NextRequest, NextResponse } from 'next/server'
import { query, execute, generateId } from '@/lib/db-client'
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
  if (id === session.user.uniqueId) {
    return jsonResponseNoCache({ error: 'No puedes agregarte a ti mismo' }, { status: 400 })
  }
  const targetRows = await query(`SELECT * FROM "User" WHERE "uniqueId" = ?`, [id])
  if (targetRows.length === 0) {
    return jsonResponseNoCache({ error: 'Usuario no encontrado' }, { status: 404 })
  }
  const target = targetRows[0]
  if (target.blocked) {
    return jsonResponseNoCache({ error: 'Esa cuenta está bloqueada' }, { status: 403 })
  }

  // Check if friendship already exists (both directions)
  const existing = await query(
    `SELECT id FROM "Friendship" WHERE "userId" = ? AND "friendId" = ?`,
    [session.user.id, target.id],
  )
  if (existing.length === 0) {
    const now = new Date().toISOString()
    const fid1 = generateId()
    const fid2 = generateId()
    await execute(
      `INSERT INTO "Friendship" (id, "userId", "friendId", status, "createdAt") VALUES (?, ?, ?, ?, ?)`,
      [fid1, session.user.id, target.id, 'accepted', now],
    )
    // Check reverse
    const reverseExisting = await query(
      `SELECT id FROM "Friendship" WHERE "userId" = ? AND "friendId" = ?`,
      [target.id, session.user.id],
    )
    if (reverseExisting.length === 0) {
      await execute(
        `INSERT INTO "Friendship" (id, "userId", "friendId", status, "createdAt") VALUES (?, ?, ?, ?, ?)`,
        [fid2, target.id, session.user.id, 'accepted', now],
      )
    }
  }

  return jsonResponseNoCache({
    friend: {
      uniqueId: target.uniqueId,
      username: target.username,
      firstName: target.firstName,
      lastName: target.lastName,
    },
  })
}
