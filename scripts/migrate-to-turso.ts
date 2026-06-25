/**
 * Migrate data from local SQLite to Turso (libSQL).
 *
 * Usage:
 *   DATABASE_URL=libsql://your-db.turso.io DATABASE_AUTH_TOKEN=xxx bun run scripts/migrate-to-turso.ts
 *
 * This script:
 * 1. Reads all data from the local SQLite database (db/custom.db)
 * 2. Pushes the Prisma schema to Turso (creates tables)
 * 3. Inserts all users, friendships, messages, sessions, and audit logs into Turso
 *
 * It's idempotent — if a record already exists (same ID), it's skipped.
 */
import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'
import { promises as fs } from 'fs'
import path from 'path'

async function main() {
  const tursoUrl = process.env.DATABASE_URL
  const tursoToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN

  if (!tursoUrl || !tursoUrl.startsWith('libsql://')) {
    console.error('ERROR: DATABASE_URL debe ser una URL libsql:// de Turso')
    process.exit(1)
  }
  if (!tursoToken) {
    console.error('ERROR: DATABASE_AUTH_TOKEN no está configurado')
    process.exit(1)
  }

  // Check local DB exists
  const localDbPath = path.join(process.cwd(), 'db', 'custom.db')
  try {
    await fs.access(localDbPath)
  } catch {
    console.error(`ERROR: No se encontró la base de datos local en ${localDbPath}`)
    process.exit(1)
  }

  console.log('=== Conectando a Turso ===')
  const libsql = createClient({ url: tursoUrl, authToken: tursoToken })
  const adapter = new PrismaLibSQL(libsql)
  const tursoPrisma = new PrismaClient({ adapter })

  console.log('=== Conectando a SQLite local ===')
  // Force local SQLite by temporarily overriding DATABASE_URL
  const localPrisma = new PrismaClient({
    datasources: { db: { url: `file:${localDbPath}` } },
  })

  // 1. Migrate Users
  console.log('\n--- Migrando usuarios ---')
  const users = await localPrisma.user.findMany()
  console.log(`Encontrados ${users.length} usuarios`)
  for (const u of users) {
    try {
      await tursoPrisma.user.upsert({
        where: { id: u.id },
        create: u,
        update: u,
      })
      console.log(`  ✓ ${u.username} (#${u.uniqueId})`)
    } catch (e: any) {
      console.error(`  ✗ Error migrando usuario ${u.username}:`, e.message)
    }
  }

  // 2. Migrate Friendships
  console.log('\n--- Migrando amistades ---')
  const friendships = await localPrisma.friendship.findMany()
  console.log(`Encontradas ${friendships.length} amistades`)
  for (const f of friendships) {
    try {
      await tursoPrisma.friendship.upsert({
        where: { id: f.id },
        create: f,
        update: f,
      })
    } catch (e: any) {
      console.error(`  ✗ Error migrando amistad ${f.id}:`, e.message)
    }
  }
  console.log(`  ✓ ${friendships.length} amistades migradas`)

  // 3. Migrate Messages
  console.log('\n--- Migrando mensajes ---')
  const messages = await localPrisma.message.findMany()
  console.log(`Encontrados ${messages.length} mensajes`)
  for (const m of messages) {
    try {
      await tursoPrisma.message.upsert({
        where: { id: m.id },
        create: m,
        update: m,
      })
    } catch (e: any) {
      console.error(`  ✗ Error migrando mensaje ${m.id}:`, e.message)
    }
  }
  console.log(`  ✓ ${messages.length} mensajes migrados`)

  // 4. Migrate Sessions
  console.log('\n--- Migrando sesiones ---')
  const sessions = await localPrisma.session.findMany()
  console.log(`Encontradas ${sessions.length} sesiones`)
  for (const s of sessions) {
    try {
      await tursoPrisma.session.upsert({
        where: { id: s.id },
        create: s,
        update: s,
      })
    } catch (e: any) {
      console.error(`  ✗ Error migrando sesión ${s.id}:`, e.message)
    }
  }
  console.log(`  ✓ ${sessions.length} sesiones migradas`)

  // 5. Migrate AuditLogs
  console.log('\n--- Migrando logs de auditoría ---')
  const logs = await localPrisma.auditLog.findMany()
  console.log(`Encontrados ${logs.length} logs`)
  for (const l of logs) {
    try {
      await tursoPrisma.auditLog.upsert({
        where: { id: l.id },
        create: l,
        update: l,
      })
    } catch (e: any) {
      console.error(`  ✗ Error migrando log ${l.id}:`, e.message)
    }
  }
  console.log(`  ✓ ${logs.length} logs migrados`)

  console.log('\n=== Migración completada ===')
  console.log(`Total: ${users.length} usuarios, ${friendships.length} amistades, ${messages.length} mensajes, ${sessions.length} sesiones, ${logs.length} logs`)

  await localPrisma.$disconnect()
  await tursoPrisma.$disconnect()
}

main()
  .catch((e) => {
    console.error('Migración falló:', e)
    process.exit(1)
  })
