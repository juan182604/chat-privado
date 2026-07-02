/**
 * Direct HTTP client for Turso — no native modules needed.
 * Uses fetch() to call the Turso HTTP API directly.
 */

const TURSO_URL = process.env.DATABASE_URL || ''
const TURSO_TOKEN = process.env.DATABASE_AUTH_TOKEN || ''

function getHttpUrl(): string {
  // Convert libsql:// to https://
  let url = TURSO_URL
  if (url.startsWith('libsql://')) {
    url = 'https://' + url.substring(9)
  }
  return url
}

async function tursoRequest(sql: string, args: any[] = []) {
  const url = getHttpUrl() + '/v2/pipeline'
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        { type: 'execute', stmt: { sql, args } },
        { type: 'close' },
      ],
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Turso error ${res.status}: ${text}`)
  }
  const data = await res.json()
  const result = data.results?.[0]?.response?.result
  if (!result) return { rows: [], rowsAffected: 0, lastInsertRowid: null }
  
  const cols = result.cols?.map((c: any) => c.name) || []
  const rows = (result.rows || []).map((row: any) => {
    const obj: any = {}
    for (let i = 0; i < cols.length; i++) {
      const val = row[i]
      if (val?.type === 'integer') obj[cols[i]] = parseInt(val.value)
      else if (val?.type === 'float') obj[cols[i]] = parseFloat(val.value)
      else if (val?.type === 'text') obj[cols[i]] = val.value
      else if (val?.type === 'blob') obj[cols[i]] = val.value
      else if (val?.type === 'null') obj[cols[i]] = null
      else obj[cols[i]] = val?.value ?? null
    }
    return obj
  })
  return { rows, rowsAffected: result.affected_row_count || 0, lastInsertRowid: result.last_insert_rowid }
}

export async function sql(strings: TemplateStringsArray, ...values: any[]) {
  let query = ''
  for (let i = 0; i < strings.length; i++) {
    query += strings[i]
    if (i < values.length) query += '?'
  }
  const result = await tursoRequest(query, values)
  return result.rows
}

export async function query(sqlText: string, args: any[] = []) {
  const result = await tursoRequest(sqlText, args)
  return result.rows
}

export async function execute(sqlText: string, args: any[] = []) {
  const result = await tursoRequest(sqlText, args)
  return { changes: result.rowsAffected, lastInsertRowid: result.lastInsertRowid }
}

export async function transaction(statements: Array<{ sql: string; args?: any[] }>) {
  // Execute sequentially (not a real transaction but good enough)
  const results = []
  for (const s of statements) {
    results.push(await tursoRequest(s.sql, s.args || []))
  }
  return results
}

export function generateId(): string {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}
