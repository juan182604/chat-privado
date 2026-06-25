import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { markConversationRead } from '@/lib/cleanup'
import { jsonResponseNoCache } from '@/lib/no-cache'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return jsonResponseNoCache({ error: 'No autenticado' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const id = (body.peerUniqueId ?? '').toString().trim().toLowerCase()
  if (!/^[a-z0-9]{6}$/.test(id)) {
    return jsonResponseNoCache({ error: 'ID inválido' }, { status: 400 })
  }
  const marked = await markConversationRead(session.user.uniqueId, id)
  return jsonResponseNoCache({ marked })
}
