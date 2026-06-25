import { query } from '@/lib/db-client'
import { promises as fs } from 'fs'

async function main() {
  const data: any = { _exportedAt: new Date().toISOString(), _version: '1.0' }
  
  console.log('Exportando usuarios...')
  data.users = await query(`SELECT id, "uniqueId", username, "firstName", "lastName", role, blocked, "blockReason", "blockedAt", "createdAt", "updatedAt" FROM "User"`)
  console.log(`  ${data.users.length} usuarios`)
  // NO exportar pinHash por seguridad — se regeneran con el PIN
  
  console.log('Exportando amistades...')
  data.friendships = await query(`SELECT * FROM "Friendship"`)
  console.log(`  ${data.friendships.length} amistades`)
  
  console.log('Exportando mensajes...')
  data.messages = await query(`SELECT * FROM "Message" ORDER BY "sentAt" ASC`)
  console.log(`  ${data.messages.length} mensajes`)
  
  console.log('Exportando sesiones...')
  data.sessions = await query(`SELECT * FROM "Session"`)
  console.log(`  ${data.sessions.length} sesiones`)
  
  console.log('Exportando logs...')
  data.auditLogs = await query(`SELECT * FROM "AuditLog" ORDER BY "createdAt" DESC`)
  console.log(`  ${data.auditLogs.length} logs`)
  
  await fs.writeFile('/home/z/my-project/download/backup/database-export.json', JSON.stringify(data, null, 2))
  console.log('\n✓ Exportado a download/backup/database-export.json')
  console.log(`Tamaño: ${JSON.stringify(data).length} bytes`)
}

main().catch(e => { console.error(e); process.exit(1) })
