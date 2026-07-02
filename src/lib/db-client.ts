import { createClient, type Client } from '@libsql/client'

let _client: Client | null = null

function getClient(): Client {
  if (_client) return _client
  let url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL no está configurada')
  const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN
  _client = createClient({ url, authToken, intMode: 'number' })
  return _client
}

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
    for (const key in row) { if (key === 'length') continue; obj[key] = row[key as keyof typeof row] }
    return obj
  })
}

export async function query(sqlText: string, args: any[] = []) {
  const client = getClient()
  const result = await client.execute({ sql: sqlText, args })
  return result.rows.map((row) => {
    const obj: any = {}
    for (const key in row) { if (key === 'length') continue; obj[key] = row[key as keyof typeof row] }
    return obj
  })
}

export async function execute(sqlText: string, args: any[] = []) {
  const client = getClient()
  const result = await client.execute({ sql: sqlText, args })
  return { changes: result.rowsAffected, lastInsertRowid: result.lastInsertRowid }
}

export async function transaction(statements: Array<{ sql: string; args?: any[] }>) {
  const client = getClient()
  const batch = statements.map((s) => ({ sql: s.sql, args: s.args || [] }))
  const result = await client.batch(batch as any, 'write')
  return result
}

export function generateId(): string {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}
