import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db-client'
import { getSession } from '@/lib/session'
import { jsonResponseNoCache } from '@/lib/no-cache'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return jsonResponseNoCache({ error: 'No autenticado' }, { status: 401 })
  }
  const id = req.nextUrl.searchParams.get('id')?.trim().toLowerCase() ?? ''
  if (!/^[a-z0-9]{6}$/.test(id)) {
    return jsonResponseNoCache(
      { error: 'ID debe ser 6 caracteres (letras minúsculas + números)' },
      { status: 400 },
    )
  }
  const rows = await query(
    `SELECT "uniqueId", username, "firstName", "lastName" FROM "User" WHERE "uniqueId" = ?`,
    [id],
  )
  if (rows.length === 0) {
    return jsonResponseNoCache({ error: 'Usuario no encontrado' }, { status: 404 })
  }
  if (rows[0].uniqueId === session.user.uniqueId) {
    return jsonResponseNoCache({ error: 'Ese es tu propio ID' }, { status: 400 })
  }
  return jsonResponseNoCache({ user: rows[0] })
}
