// Re-export the database client for backward compatibility.
// The actual implementation is in db-client.ts which uses libsql directly
// (no Prisma ORM) for reliable production use with Turso.
export { query, execute, transaction, generateId, sql } from '@/lib/db-client'
