import { NextRequest, NextResponse } from 'next/server'
import { query, execute } from '@/lib/db-client'
import { generateId } from '@/lib/db-client'
import { hashPin, generateUnique6CharId } from '@/lib/auth-utils'
import { createSession, setSessionCookie } from '@/lib/session'
import { jsonResponseNoCache } from '@/lib/no-cache'

const USERNAME_RE = /^[a-z0-9_]{3,20}$/
const PIN_RE = /^\d{6}$/

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonResponseNoCache({ error: 'JSON inválido' }, { status: 400 })
  }

  const username = (body.username ?? '').toString().trim().toLowerCase()
  const firstName = (body.firstName ?? '').toString().trim()
  const lastName = (body.lastName ?? '').toString().trim()
  const pin = (body.pin ?? '').toString().trim()
  const persistent = !!body.persistent

  if (!USERNAME_RE.test(username)) {
    return jsonResponseNoCache(
      { error: 'Usuario inválido. 3-20 caracteres: letras minúsculas, números o _' },
      { status: 400 },
    )
  }
  if (!firstName || firstName.length > 40) {
    return jsonResponseNoCache({ error: 'Nombre requerido' }, { status: 400 })
  }
  if (!lastName || lastName.length > 40) {
    return jsonResponseNoCache({ error: 'Apellido requerido' }, { status: 400 })
  }
  if (!PIN_RE.test(pin)) {
    return jsonResponseNoCache({ error: 'PIN debe ser 6 dígitos' }, { status: 400 })
  }

  // Check username uniqueness
  const existing = await query(`SELECT id FROM "User" WHERE username = ?`, [username])
  if (existing.length > 0) {
    return jsonResponseNoCache({ error: 'Ese usuario ya existe' }, { status: 409 })
  }

  // Generate unique 6-char ID
  let uniqueId = ''
  for (let i = 0; i < 8; i++) {
    const candidate = generateUnique6CharId()
    const clash = await query(`SELECT id FROM "User" WHERE "uniqueId" = ?`, [candidate])
    if (clash.length === 0) {
      uniqueId = candidate
      break
    }
  }
  if (!uniqueId) {
    return jsonResponseNoCache({ error: 'No se pudo generar ID único. Reintente.' }, { status: 500 })
  }

  const id = generateId()
  const now = new Date().toISOString()
  await execute(
    `INSERT INTO "User" (id, "uniqueId", username, "firstName", "lastName", "pinHash", role, blocked, "createdAt", "updatedAt")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, uniqueId, username, firstName, lastName, hashPin(pin), 'user', 0, now, now],
  )

  const { token, expiresAt } = await createSession(id, persistent)
  await setSessionCookie(token, expiresAt, persistent)

  return jsonResponseNoCache({
    user: { id, uniqueId, username, firstName, lastName, role: 'user' },
    uniqueId,
  })
}
