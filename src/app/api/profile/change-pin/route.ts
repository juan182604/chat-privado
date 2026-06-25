import { NextRequest, NextResponse } from 'next/server'
import { query, execute } from '@/lib/db-client'
import { getSession } from '@/lib/session'
import { verifyPin, hashPin } from '@/lib/auth-utils'
import { jsonResponseNoCache } from '@/lib/no-cache'

const PIN_RE = /^\d{6}$/

/**
 * POST /api/profile/change-pin
 * Body: { currentPin: string, newPin: string }
 *
 * Changes the login PIN. Requires the current PIN for verification.
 * The username never changes — only the PIN.
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return jsonResponseNoCache({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const currentPin = (body.currentPin ?? '').toString().trim()
  const newPin = (body.newPin ?? '').toString().trim()

  if (!PIN_RE.test(currentPin) || !PIN_RE.test(newPin)) {
    return jsonResponseNoCache({ error: 'Los PIN deben ser 6 dígitos' }, { status: 400 })
  }

  if (currentPin === newPin) {
    return jsonResponseNoCache({ error: 'El nuevo PIN debe ser diferente al actual' }, { status: 400 })
  }

  // Get current pinHash
  const rows = await query(`SELECT "pinHash" FROM "User" WHERE id = ?`, [session.user.id])
  if (rows.length === 0) {
    return jsonResponseNoCache({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  // Verify current PIN
  if (!verifyPin(currentPin, rows[0].pinHash)) {
    return jsonResponseNoCache({ error: 'PIN actual incorrecto' }, { status: 401 })
  }

  // Update PIN
  const now = new Date().toISOString()
  await execute(
    `UPDATE "User" SET "pinHash" = ?, "updatedAt" = ? WHERE id = ?`,
    [hashPin(newPin), now, session.user.id],
  )

  return jsonResponseNoCache({ ok: true })
}
