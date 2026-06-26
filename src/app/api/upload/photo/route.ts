import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { uploadFile } from '@/lib/storage'
import { randomBytes } from 'crypto'
import { jsonResponseNoCache } from '@/lib/no-cache'

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return jsonResponseNoCache({ error: 'No autenticado' }, { status: 401 })
  }
  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return jsonResponseNoCache({ error: 'Falta archivo' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return jsonResponseNoCache({ error: 'Foto demasiado grande (máx 8MB)' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) {
    return jsonResponseNoCache({ error: 'Solo se permiten imágenes' }, { status: 400 })
  }
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().slice(0, 4)
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : 'jpg'
  const name = `${Date.now()}-${randomBytes(4).toString('hex')}.${safeExt}`
  const mediaPath = `photo/${name}`
  const buf = Buffer.from(await file.arrayBuffer())
  await uploadFile(mediaPath, buf, file.type)
  return jsonResponseNoCache({ mediaPath })
}
