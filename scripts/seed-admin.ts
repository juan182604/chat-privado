/**
 * Seed the super admin user (croki01 / PIN 261823) on first run.
 * Idempotent: re-runs safely.
 */
import { query, execute, generateId } from '@/lib/db-client'
import { hashPin } from '@/lib/auth-utils'

async function main() {
  const username = 'croki01'
  const pin = '261823'
  const existing = await query(`SELECT id, role FROM "User" WHERE username = ?`, [username])
  if (existing.length > 0) {
    if (existing[0].role !== 'super_admin') {
      await execute(`UPDATE "User" SET role = 'super_admin' WHERE id = ?`, [existing[0].id])
      console.log(`[seed] Promoted ${username} to super_admin`)
    } else {
      console.log(`[seed] ${username} already super_admin`)
    }
    return
  }
  const uniqueId = 'croki0'
  const id = generateId()
  const now = new Date().toISOString()
  await execute(
    `INSERT INTO "User" (id, "uniqueId", username, "firstName", "lastName", "pinHash", role, blocked, "createdAt", "updatedAt")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, uniqueId, username, 'Croki', 'Admin', hashPin(pin), 'super_admin', 0, now, now],
  )
  console.log(`[seed] Created super_admin ${username} (uniqueId=${uniqueId})`)
}

main()
  .catch((e) => {
    console.error('[seed] failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    // Connection is managed by the db-client singleton, no explicit disconnect needed
  })
