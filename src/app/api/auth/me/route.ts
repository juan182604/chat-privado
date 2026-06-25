import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { jsonResponseNoCache } from '@/lib/no-cache'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return jsonResponseNoCache({ user: null }, { status: 200 })
  }
  return jsonResponseNoCache({
    user: {
      id: session.user.id,
      uniqueId: session.user.uniqueId,
      username: session.user.username,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      displayName: (session.user as any).displayName || null,
      role: session.user.role,
    },
    persistent: session.persistent,
  })
}
