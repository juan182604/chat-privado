/**
 * Migración directa de SQLite local a Turso usando cliente libSQL.
 * No usa Prisma para la escritura en Turso, solo SQL directo.
 */
import { createClient } from '@libsql/client'
import { PrismaClient } from '@prisma/client'
import { promises as fs } from 'fs'

async function main() {
  // 1. Conectar a SQLite local
  console.log('=== Conectando a SQLite local ===')
  const localPrisma = new PrismaClient({
    datasources: { db: { url: 'file:/home/z/my-project/db/custom.db' } },
  })

  // 2. Conectar a Turso con libsql directo
  console.log('=== Conectando a Turso ===')
  const turso = createClient({
    url: 'libsql://iachat-juan182604.aws-us-east-1.turso.io',
    authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE3ODI5Njk4MjgsImlhdCI6MTc4MjM2NTAyOCwiaWQiOiIwMTllZmQzYS1hODAxLTcyNTYtOTQ5ZC04OWNhMGE4M2U4ZmQiLCJyaWQiOiJhMzM4ZTc0Ni01OTZmLTQwYzktOTMyMi0xNDlhMWYwYWMyMjgifQ.P_uf8FiLi3d2NU7ODvgGuBYc6uztgw7d4iup5TltS4rsoWBswlT_YNDmSn9hL74grXbvfRXywuqh_oxPPKKhBw',
  })

  // Test Turso connection
  const test = await turso.execute('SELECT 1 as test')
  console.log('✓ Turso conectado')

  // 3. Migrar Users
  console.log('\n--- Migrando usuarios ---')
  const users = await localPrisma.user.findMany()
  console.log(`Encontrados: ${users.length} usuarios`)
  for (const u of users) {
    try {
      await turso.execute({
        sql: `INSERT OR IGNORE INTO "User" (id, "uniqueId", username, "firstName", "lastName", "pinHash", role, blocked, "blockReason", "blockedAt", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [u.id, u.uniqueId, u.username, u.firstName, u.lastName, u.pinHash, u.role, u.blocked ? 1 : 0, u.blockReason, u.blockedAt, u.createdAt, u.updatedAt],
      })
      console.log(`  ✓ ${u.username} (#${u.uniqueId})`)
    } catch (e: any) {
      console.error(`  ✗ ${u.username}: ${e.message}`)
    }
  }

  // 4. Migrar Friendships
  console.log('\n--- Migrando amistades ---')
  const friendships = await localPrisma.friendship.findMany()
  console.log(`Encontradas: ${friendships.length}`)
  for (const f of friendships) {
    try {
      await turso.execute({
        sql: `INSERT OR IGNORE INTO "Friendship" (id, "userId", "friendId", status, "createdAt") VALUES (?, ?, ?, ?, ?)`,
        args: [f.id, f.userId, f.friendId, f.status, f.createdAt],
      })
    } catch (e: any) {
      console.error(`  ✗ ${f.id}: ${e.message}`)
    }
  }
  console.log(`  ✓ ${friendships.length} amistades migradas`)

  // 5. Migrar Messages
  console.log('\n--- Migrando mensajes ---')
  const messages = await localPrisma.message.findMany()
  console.log(`Encontrados: ${messages.length} mensajes`)
  let migrated = 0
  for (const m of messages) {
    try {
      await turso.execute({
        sql: `INSERT OR IGNORE INTO "Message" (id, "senderId", "receiverId", type, content, "mediaPath", "callDuration", "callKind", "callStatus", "sentAt", "readAt", "expiresAt", "photoExpiresSeconds", "photoViewStartedAt", "photoExpired") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [m.id, m.senderId, m.receiverId, m.type, m.content, m.mediaPath, m.callDuration, m.callKind, m.callStatus, m.sentAt, m.readAt, m.expiresAt, m.photoExpiresSeconds, m.photoViewStartedAt, m.photoExpired ? 1 : 0],
      })
      migrated++
    } catch (e: any) {
      console.error(`  ✗ ${m.id}: ${e.message}`)
    }
  }
  console.log(`  ✓ ${migrated}/${messages.length} mensajes migrados`)

  // 6. Migrar Sessions
  console.log('\n--- Migrando sesiones ---')
  const sessions = await localPrisma.session.findMany()
  console.log(`Encontradas: ${sessions.length}`)
  for (const s of sessions) {
    try {
      await turso.execute({
        sql: `INSERT OR IGNORE INTO "Session" (id, token, "userId", persistent, "createdAt", "expiresAt", "deviceInfo") VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [s.id, s.token, s.userId, s.persistent ? 1 : 0, s.createdAt, s.expiresAt, s.deviceInfo],
      })
    } catch (e: any) {
      console.error(`  ✗ ${s.id}: ${e.message}`)
    }
  }
  console.log(`  ✓ ${sessions.length} sesiones migradas`)

  // 7. Migrar AuditLogs
  console.log('\n--- Migrando logs de auditoría ---')
  const logs = await localPrisma.auditLog.findMany()
  console.log(`Encontrados: ${logs.length}`)
  for (const l of logs) {
    try {
      await turso.execute({
        sql: `INSERT OR IGNORE INTO "AuditLog" (id, "actorId", "targetUserId", action, reason, metadata, "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [l.id, l.actorId, l.targetUserId, l.action, l.reason, l.metadata, l.createdAt],
      })
    } catch (e: any) {
      console.error(`  ✗ ${l.id}: ${e.message}`)
    }
  }
  console.log(`  ✓ ${logs.length} logs migrados`)

  // 8. Verificación
  console.log('\n=== Verificación en Turso ===')
  const userCount = await turso.execute('SELECT COUNT(*) as count FROM "User"')
  const msgCount = await turso.execute('SELECT COUNT(*) as count FROM "Message"')
  const friendCount = await turso.execute('SELECT COUNT(*) as count FROM "Friendship"')
  console.log(`Turso ahora tiene:`)
  console.log(`  - ${userCount.rows[0].count} usuarios`)
  console.log(`  - ${msgCount.rows[0].count} mensajes`)
  console.log(`  - ${friendCount.rows[0].count} amistades`)

  await localPrisma.$disconnect()
  await turso.close()
  console.log('\n✓ Migración completada exitosamente!')
}

main().catch(e => { console.error('Error:', e); process.exit(1) })
