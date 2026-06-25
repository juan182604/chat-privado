/**
 * Direct libSQL client for Turso.
 * Replaces Prisma ORM — works reliably in production with Render + Turso.
 *
 * Exposes a `sql` function for tagged template queries and helper methods
 * for common operations. All queries use parameterized arguments to prevent
 * SQL injection.
 */
import { createClient, type Client } from '@libsql/client'

let _client: Client | null = null

function getClient(): Client {
  if (_client) return _client
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL no está configurada')
  const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN
  _client = createClient({ url, authToken })
  return _client
}

/**
 * Tagged template literal for SQL queries.
 * Usage: const result = await sql`SELECT * FROM "User" WHERE id = ${userId}`
 * Returns the rows array.
 */
export async function sql(strings: TemplateStringsArray, ...values: any[]) {
  const client = getClient()
  let query = ''
  for (let i = 0; i < strings.length; i++) {
    query += strings[i]
    if (i < values.length) query += '?'
  }
  const result = await client.execute({ sql: query, args: values })
  return result.rows.map((row) => {
    const obj: any = {}
    for (const key in row) {
      if (key === 'length') continue
      obj[key] = row[key as keyof typeof row]
    }
    return obj
  })
}

/**
 * Execute a raw SQL query with args. Returns rows.
 */
export async function query(sqlText: string, args: any[] = []) {
  const client = getClient()
  const result = await client.execute({ sql: sqlText, args })
  return result.rows.map((row) => {
    const obj: any = {}
    for (const key in row) {
      if (key === 'length') continue
      obj[key] = row[key as keyof typeof row]
    }
    return obj
  })
}

/**
 * Execute a raw SQL statement (INSERT/UPDATE/DELETE) and return metadata.
 */
export async function execute(sqlText: string, args: any[] = []) {
  const client = getClient()
  const result = await client.execute({ sql: sqlText, args })
  return {
    changes: result.rowsAffected,
    lastInsertRowid: result.lastInsertRowid,
  }
}

/**
 * Run multiple statements in a transaction.
 */
export async function transaction(statements: Array<{ sql: string; args?: any[] }>) {
  const client = getClient()
  const batch = statements.map((s) => ({
    sql: s.sql,
    args: s.args || [],
  }))
  const result = await client.batch(batch as any, 'write')
  return result
}

/**
 * Generate a CUID-like ID for new records.
 */
export function generateId(): string {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

// ===== Type definitions matching the database schema =====

export type User = {
  id: string
  uniqueId: string
  username: string
  firstName: string
  lastName: string
  pinHash: string
  role: string
  blocked: number | boolean
  blockReason: string | null
  blockedAt: string | null
  createdAt: string
  updatedAt: string
}

export type Message = {
  id: string
  senderId: string
  receiverId: string
  type: string
  content: string | null
  mediaPath: string | null
  callDuration: number | null
  callKind: string | null
  callStatus: string | null
  sentAt: string
  readAt: string | null
  expiresAt: string
  photoExpiresSeconds: number | null
  photoViewStartedAt: string | null
  photoExpired: number | boolean
}

export type Friendship = {
  id: string
  userId: string
  friendId: string
  status: string
  createdAt: string
}

export type Session = {
  id: string
  token: string
  userId: string
  persistent: number | boolean
  createdAt: string
  expiresAt: string
  deviceInfo: string | null
}

export type AuditLog = {
  id: string
  actorId: string
  targetUserId: string | null
  action: string
  reason: string | null
  metadata: string | null
  createdAt: string
}

// Helper to normalize boolean fields (SQLite stores them as 0/1)
export function normalizeUser(row: any): User {
  return {
    ...row,
    blocked: !!row.blocked,
  }
}

export function normalizeMessage(row: any): Message {
  return {
    ...row,
    photoExpired: !!row.photoExpired,
  }
}

export function normalizeSession(row: any): Session {
  return {
    ...row,
    persistent: !!row.persistent,
  }
}
