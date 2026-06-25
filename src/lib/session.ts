import { query, execute } from '@/lib/db-client'
import { generateSessionToken, plus10Hours } from '@/lib/auth-utils'
import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'nx_session'
const PERSISTENT_TTL_MS = 365 * 24 * 60 * 60 * 1000
const EPHEMERAL_TTL_MS = 24 * 60 * 60 * 1000

export async function createSession(
  userId: string,
  persistent: boolean,
  deviceInfo?: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + (persistent ? PERSISTENT_TTL_MS : EPHEMERAL_TTL_MS))
  const id = generateIdFromDb()
  await execute(
    `INSERT INTO "Session" (id, token, "userId", persistent, "createdAt", "expiresAt", "deviceInfo") VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, token, userId, persistent ? 1 : 0, new Date().toISOString(), expiresAt.toISOString(), deviceInfo ?? null],
  )
  return { token, expiresAt }
}

// We need a unique ID generator that doesn't depend on db-client
function generateIdFromDb(): string {
  return 's' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const rows = await query(
    `SELECT s.*, u."uniqueId", u.username, u."firstName", u."lastName", u."displayName", u."pinHash", u.role, u.blocked, u."blockReason", u."blockedAt", u."createdAt", u."updatedAt"
     FROM "Session" s
     JOIN "User" u ON s."userId" = u.id
     WHERE s.token = ?`,
    [token],
  )
  if (rows.length === 0) return null

  const row = rows[0]
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    await execute(`DELETE FROM "Session" WHERE id = ?`, [row.id])
    return null
  }
  if (row.blocked) return null

  return {
    id: row.id,
    token: row.token,
    userId: row.userId,
    persistent: !!row.persistent,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    deviceInfo: row.deviceInfo,
    user: {
      id: row.userId,
      uniqueId: row.uniqueId,
      username: row.username,
      firstName: row.firstName,
      lastName: row.lastName,
      displayName: row.displayName || null,
      pinHash: row.pinHash,
      role: row.role,
      blocked: !!row.blocked,
      blockReason: row.blockReason,
      blockedAt: row.blockedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
  }
}

export async function destroySession(token: string): Promise<void> {
  try {
    await execute(`DELETE FROM "Session" WHERE token = ?`, [token])
  } catch {}
}

export async function setSessionCookie(
  token: string,
  expiresAt: Date,
  persistent: boolean,
): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: persistent ? expiresAt : undefined,
    maxAge: persistent ? Math.floor((expiresAt.getTime() - Date.now()) / 1000) : undefined,
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}
