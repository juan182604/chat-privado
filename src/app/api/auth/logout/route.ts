import { NextResponse } from 'next/server'
import { execute } from '@/lib/db-client'
import { getSession, clearSessionCookie, SESSION_COOKIE } from '@/lib/session'
import { cookies } from 'next/headers'
import { jsonResponseNoCache } from '@/lib/no-cache'

export async function POST() {
  const session = await getSession()
  if (session) {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (token) {
      try {
        await execute(`DELETE FROM "Session" WHERE token = ?`, [token])
      } catch {}
    }
  }
  await clearSessionCookie()
  return jsonResponseNoCache({ ok: true })
}
