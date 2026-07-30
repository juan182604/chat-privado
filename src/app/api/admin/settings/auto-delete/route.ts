import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getAppSettings, setAutoDeleteEnabled, setAutoDeleteHours } from '@/lib/settings'
import { query, execute } from '@/lib/db-client'
import { jsonResponseNoCache } from '@/lib/no-cache'

/**
 * POST /api/admin/settings/auto-delete
 * Body: { enabled: boolean, hours?: number }
 *
 * Toggles the global auto-delete setting.
 * - When enabled=true, messages auto-delete after `hours` (default 10).
 * - When enabled=false, messages are PERMANENT until admin manually deletes them.
 *
 * If enabling, you can optionally pass `hours` to change the auto-delete window.
 * If enabling and `hours` is not provided, the existing hours value is kept
 * (or defaults to 10 if never set).
 *
 * When enabling, also recalculates expiresAt for all existing unread messages
 * to be sentAt + hours, so old messages get cleaned up too.
 * When disabling, sets all messages' expiresAt to far-future (year 2099).
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
    return jsonResponseNoCache({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const enabled = !!body.enabled
  const hours = typeof body.hours === 'number' ? body.hours : null

  // Update settings
  await setAutoDeleteEnabled(enabled)
  if (hours !== null) {
    await setAutoDeleteHours(hours)
  }

  const settings = await getAppSettings()

  // Recalculate expiresAt for ALL existing messages
  if (enabled) {
    // Set expiresAt = sentAt + autoDeleteHours for all messages
    const allMsgs = await query(`SELECT id, "sentAt", "readAt" FROM "Message" WHERE "photoExpired" = 0`)
    const h = settings.autoDeleteHours
    for (let i = 0; i < allMsgs.length; i += 50) {
      const batch = allMsgs.slice(i, i + 50)
      for (const m of batch) {
        const base = m.readAt ? new Date(m.readAt) : new Date(m.sentAt)
        const expiry = new Date(base.getTime() + h * 60 * 60 * 1000).toISOString()
        await execute(
          `UPDATE "Message" SET "expiresAt" = ? WHERE id = ?`,
          [expiry, m.id],
        )
      }
    }
  } else {
    // Disabling — set all messages to far-future expiry (permanent)
    await execute(
      `UPDATE "Message" SET "expiresAt" = '2099-12-31T23:59:59.999Z' WHERE "photoExpired" = 0`,
    )
  }

  return jsonResponseNoCache({
    success: true,
    settings,
    message: enabled
      ? `Auto-eliminación ACTIVADA. Los mensajes se borrarán automáticamente después de ${settings.autoDeleteHours} horas.`
      : 'Auto-eliminación DESACTIVADA. Los mensajes ahora son permanentes hasta que el admin los borre.',
  })
}
