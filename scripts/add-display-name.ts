import { execute, query } from '@/lib/db-client'

async function main() {
  // Add displayName column (nullable — defaults to NULL, meaning use firstName + lastName)
  try {
    await execute(`ALTER TABLE "User" ADD COLUMN "displayName" TEXT`)
    console.log('✓ Column displayName added')
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      console.log('✓ Column displayName already exists')
    } else {
      console.error('Error:', e.message)
    }
  }

  // Verify
  const rows = await query(`PRAGMA table_info("User")`)
  console.log('\nColumns:')
  for (const r of rows) {
    console.log(`  - ${r.name}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
