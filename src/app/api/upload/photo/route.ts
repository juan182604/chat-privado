import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { uploadFile } from '@/lib/storage'
import { generateId } from '@/lib/db-client'
import { jsonResponseNoCache } from '@/lib/no-cache'
import path from 'path'

/**
 * POST /api/upload/photo
 * Uploads a photo to R2 (or local disk in dev) and returns the mediaPath.
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

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return jsonResponseNoCache(
        { error: `Tipo de archivo no permitido: ${file.type}. Solo JPG, PNG, GIF, WebP` },
        { status: 400 },
      )
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return jsonResponseNoCache({ error: 'La foto es demasiado grande (máx 10MB)' }, { status: 400 })
    }

    // Generate unique mediaPath: photo/<userId>/<id>.<ext>
    const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
    const mediaPath = `photo/${session.user.id}/${generateId()}.${ext}`

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to R2 or local disk
    await uploadFile(mediaPath, buffer, file.type)

    return jsonResponseNoCache({
      mediaPath,
      size: file.size,
      contentType: file.type,
    })
  } catch (e: any) {
    console.error('Upload photo error:', e)
    return jsonResponseNoCache(
      { error: `Error al subir la foto: ${e?.message || 'desconocido'}` },
      { status: 500 },
    )
  }
}
