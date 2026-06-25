import { NextRequest, NextResponse } from 'next/server'
import { isR2Configured, getR2FileBuffer, readLocalFile } from '@/lib/storage'
import path from 'path'

/**
 * GET /api/media?path=photo/xxx.jpg
 * Serves media files from R2 (production) or local disk (development).
 */
export async function GET(req: NextRequest) {
  const mediaPath = req.nextUrl.searchParams.get('path')
  if (!mediaPath) {
    return NextResponse.json({ error: 'Falta path' }, { status: 400 })
  }
  if (mediaPath.includes('..') || mediaPath.startsWith('/')) {
    return NextResponse.json({ error: 'Path inválido' }, { status: 400 })
  }

  const ext = path.extname(mediaPath).toLowerCase()
  const contentType: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.webm': 'audio/webm',
    '.m4a': 'audio/mp4',
    '.mp4': 'audio/mp4',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
  }
  const type = contentType[ext] || 'application/octet-stream'

  let buffer: Buffer | null = null

  if (isR2Configured) {
    try {
      buffer = await getR2FileBuffer(mediaPath)
    } catch {
      buffer = null
    }
  }

  if (!buffer) {
    buffer = await readLocalFile(mediaPath)
  }

  if (!buffer) {
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
  }

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': type,
      'Cache-Control': 'private, max-age=3600',
      'Content-Length': buffer.length.toString(),
    },
  })
}
