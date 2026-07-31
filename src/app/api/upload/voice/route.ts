import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { uploadFile } from '@/lib/storage'
import { generateId } from '@/lib/db-client'
import { jsonResponseNoCache } from '@/lib/no-cache'

/**
 * POST /api/upload/voice
 * Uploads a voice note to R2 (or local disk in dev) and returns the mediaPath.
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return jsonResponseNoCache({ error: 'No autenticado' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return jsonResponseNoCache({ error: 'No se encontró el archivo' }, { status: 400 })
    }

    // Validate file type - voice notes
    const allowedTypes = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/m4a',
      'audio/mpeg',
      'audio/wav',
      'audio/x-wav',
      'application/octet-stream', // some browsers send this for webm
    ]
    // Some browsers send the type with codecs, normalize for check
    const baseType = file.type.split(';')[0].trim()
    if (!allowedTypes.includes(file.type) && !allowedTypes.includes(baseType) && !baseType.startsWith('audio/')) {
      return jsonResponseNoCache(
        { error: `Tipo de audio no permitido: ${file.type}` },
        { status: 400 },
      )
    }

    // Max 25MB for voice
    if (file.size > 25 * 1024 * 1024) {
      return jsonResponseNoCache({ error: 'El audio es demasiado grande (máx 25MB)' }, { status: 400 })
    }

    // Determine extension from type
    let ext = 'webm'
    const t = file.type.toLowerCase()
    if (t.includes('mp4') || t.includes('m4a')) ext = 'm4a'
    else if (t.includes('ogg')) ext = 'ogg'
    else if (t.includes('mp3') || t.includes('mpeg')) ext = 'mp3'
    else if (t.includes('wav')) ext = 'wav'
    else ext = 'webm'

    const contentType = file.type || `audio/${ext}`

    // Generate unique mediaPath: voice/<userId>/<id>.<ext>
    const mediaPath = `voice/${session.user.id}/${generateId()}.${ext}`

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to R2 or local disk
    await uploadFile(mediaPath, buffer, contentType)

    return jsonResponseNoCache({
      mediaPath,
      size: file.size,
      contentType,
    })
  } catch (e: any) {
    console.error('Upload voice error:', e)
    return jsonResponseNoCache(
      { error: `Error al subir el audio: ${e?.message || 'desconocido'}` },
      { status: 500 },
    )
  }
}
