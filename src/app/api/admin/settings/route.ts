import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getAppSettings, setAutoDeleteEnabled, setAutoDeleteHours } from '@/lib/settings'
import { jsonResponseNoCache } from '@/lib/no-cache'

/**
 * GET /api/admin/settings — returns current global app settings.
 */
export async function GET() {
  const session = await getSession()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
    return jsonResponseNoCache({ error: 'No autorizado' }, { status: 403 })
  }
  const settings = await getAppSettings()
  return jsonResponseNoCache({ settings })
}
