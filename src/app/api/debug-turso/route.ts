import { NextResponse } from 'next/server'
import { jsonResponseNoCache } from '@/lib/no-cache'

export async function GET() {
  const debug: any = { timestamp: new Date().toISOString() }
  
  // Test 1: Direct fetch to Turso
  try {
    const url = 'https://iachat-juan182604.aws-us-east-1.turso.io/v2/pipeline'
    const token = process.env.DATABASE_AUTH_TOKEN
    debug.url = url
    debug.tokenSet = !!token
    debug.tokenStart = token?.substring(0, 30)
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: 'execute', stmt: { sql: 'SELECT 1 as test', args: [] } }, { type: 'close' }] }),
    })
    debug.status = res.status
    const text = await res.text()
    debug.response = text.substring(0, 200)
  } catch (e: any) {
    debug.error = e.message
    debug.errorName = e.name
  }
  
  return jsonResponseNoCache(debug)
}
