import { NextRequest, NextResponse } from 'next/server'
import { execute } from '@/lib/db-client'
import { getSession } from '@/lib/session'
import { jsonResponseNoCache } from '@/lib/no-cache'

/**
 * POST /api/profile/display-name
 * Body: { displayName: string | null }
 *
 * Changes the display name shown in chats. The login username never changes.
 * Pass null or empty string to reset to the default (firstName + lastName).
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return jsonResponseNoCache({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  let displayName = (body.displayName ?? '').toString().trim()

  // Validate: max 40 chars, empty = null (reset to default)
  if (displayName.length > 40) {
    return jsonResponseNoCache({ error: 'El nombre no puede tener más de 40 caracteres' }, { status: 400 })
  }
  if (displayName.length === 0) {
    displayName = ''
  }

  const now = new Date().toISOString()
  await execute(
    `UPDATE "User" SET "displayName" = ?, "updatedAt" = ? WHERE id = ?`,
    [displayName || null, now, session.user.id],
  )

  return jsonResponseNoCache({
    ok: true,
    displayName: displayName || null,
  })
}
