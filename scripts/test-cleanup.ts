import { db } from '@/lib/db'

async function main() {
  const amigo1 = await db.user.findUnique({ where: { username: 'amigo1' } })
  const amigo2 = await db.user.findUnique({ where: { username: 'amigo2' } })
  if (!amigo1 || !amigo2) {
    console.log('Users not found')
    return
  }

  const oldDate = new Date(Date.now() - 11 * 60 * 60 * 1000)
  const expiredDate = new Date(Date.now() - 1 * 1000)
  await db.message.create({
    data: {
      senderId: amigo1.id,
      receiverId: amigo2.id,
      type: 'text',
      content: 'Este mensaje debería borrarse (ya expiró)',
      sentAt: oldDate,
      expiresAt: expiredDate,
    },
  })
  console.log('Inserted expired message')

  const before = await db.message.count()
  console.log('Messages before cleanup:', before)

  const { cleanupExpiredMessages } = await import('@/lib/cleanup')
  const deleted = await cleanupExpiredMessages()
  console.log('Deleted:', deleted)

  const after = await db.message.count()
  console.log('Messages after cleanup:', after)
}

main().then(() => db.$disconnect())
