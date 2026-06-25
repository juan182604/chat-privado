import { NextResponse } from 'next/server'

/**
 * Returns a NextResponse.json that explicitly forbids caching.
 * Use this for all dynamic endpoints (auth, messages, users, admin) so that
 * the browser always re-fetches fresh data.
 */
export function jsonResponseNoCache(data: unknown, init?: { status?: number }) {
  const res = NextResponse.json(data, init)
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.headers.set('Pragma', 'no-cache')
  res.headers.set('Expires', '0')
  res.headers.set('Surrogate-Control', 'no-store')
  return res
}
