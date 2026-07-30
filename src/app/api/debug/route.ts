import { NextResponse } from 'next/server'
import { jsonResponseNoCache } from '@/lib/no-cache'

export async function GET() {
  const debug: any = {
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN ? 'SET' : 'NOT SET',
      R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
    },
    steps: [],
  }

  // Test DB connection
  try {
    debug.steps.push('1. Importing db-client...')
    const { query } = await import('@/lib/db-client')
    debug.steps.push('   ✓ imported')

    debug.steps.push('2. Querying users...')
    const users = await query(`SELECT id, username, role FROM "User" LIMIT 5`)
    debug.steps.push(`   ✓ ${users.length} users found`)
    debug.users = users
  } catch (e: any) {
    debug.steps.push(`   ✗ ERROR: ${e.message}`)
    debug.error = e.message
    debug.stack = e.stack?.substring(0, 500)
  }

  // Test session module
  try {
    debug.steps.push('3. Testing session module...')
    const { getSession } = await import('@/lib/session')
    const session = await getSession()
    debug.steps.push(`   ✓ session module works, session: ${session ? 'YES' : 'NO'}`)
  } catch (e: any) {
    debug.steps.push(`   ✗ SESSION ERROR: ${e.message}`)
    debug.sessionError = e.message
  }

  return jsonResponseNoCache(debug)
}
