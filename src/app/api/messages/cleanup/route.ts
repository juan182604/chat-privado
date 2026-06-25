import { NextResponse } from 'next/server'
import { cleanupExpiredMessages } from '@/lib/cleanup'
import { getSession } from '@/lib/session'
import { jsonResponseNoCache } from '@/lib/no-cache'

export async function POST() {
  const session = await getSession()
  if (!session) return jsonResponseNoCache({ error: 'No autenticado' }, { status: 401 })
  if (session.user.role !== 'admin' && session.user.role !== 'super_admin') {
    return jsonResponseNoCache({ error: 'Acceso denegado' }, { status: 403 })
  }
  const deleted = await cleanupExpiredMessages()
  return jsonResponseNoCache({ deleted })
}
