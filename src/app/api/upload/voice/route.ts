import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { uploadFile } from '@/lib/storage'
import { randomBytes } from 'crypto'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

/**
 * Upload a voice note. Multipart form-data with field `file`.
 * Accepts webm, ogg, m4a, mp3, wav formats.
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta audio' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Audio demasiado largo (máx 10MB)' }, { status: 400 })
  }

  // Determine extension from the original filename or mime type
  const originalName = file.name.toLowerCase()
  let ext = 'webm'
  if (originalName.endsWith('.m4a') || originalName.endsWith('.mp4')) ext = 'm4a'
  else if (originalName.endsWith('.ogg')) ext = 'ogg'
  else if (originalName.endsWith('.mp3')) ext = 'mp3'
  else if (originalName.endsWith('.wav')) ext = 'wav'
  else if (file.type.includes('mp4')) ext = 'm4a'
  else if (file.type.includes('ogg')) ext = 'ogg'
  else if (file.type.includes('mp3')) ext = 'mp3'
  else if (file.type.includes('wav')) ext = 'wav'

  const name = `${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`
  const mediaPath = `voice/${name}`
  const buf = Buffer.from(await file.arrayBuffer())
  await uploadFile(mediaPath, buf, file.type || 'audio/webm')
  return NextResponse.json({ mediaPath })
}
