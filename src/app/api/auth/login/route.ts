import { NextRequest } from 'next/server'
import { query } from '@/lib/db-client'
import { verifyPin } from '@/lib/auth-utils'
import { createSession, setSessionCookie } from '@/lib/session'
import { jsonResponseNoCache } from '@/lib/no-cache'

const PIN_RE = /^\d{6}$/

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const username = (body.username ?? '').toString().trim().toLowerCase()
    const pin = (body.pin ?? '').toString().trim()
    const persistent = !!body.persistent

    if (!username || !PIN_RE.test(pin)) {
      return jsonResponseNoCache({ error: 'Usuario o PIN inválido' }, { status: 400 })
    }

    const rows = await query(`SELECT * FROM "User" WHERE username = ?`, [username])
    if (rows.length === 0) {
      return jsonResponseNoCache({ error: 'Usuario o PIN incorrecto' }, { status: 401 })
    }
    const user: any = rows[0]
    if (!verifyPin(pin, user.pinHash)) {
      return jsonResponseNoCache({ error: 'Usuario o PIN incorrecto' }, { status: 401 })
    }
    if (user.blocked) {
      return jsonResponseNoCache(
        { error: `Cuenta bloqueada${user.blockReason ? ': ' + user.blockReason : ''}` },
        { status: 403 },
      )
    }

    const { token, expiresAt } = await createSession(user.id, persistent)
    await setSessionCookie(token, expiresAt, persistent)

    return jsonResponseNoCache({
      user: {
        id: user.id,
        uniqueId: user.uniqueId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    })
  } catch (e: any) {
    return jsonResponseNoCache({ error: 'Error del servidor: ' + (e.message || 'desconocido') }, { status: 500 })
  }
}
