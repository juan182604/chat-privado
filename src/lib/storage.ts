import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Storage abstraction.
 * - In production (R2 configured): uses Cloudflare R2 via S3 API
 * - In development (no R2): uses local disk under /public/uploads
 */

const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads')

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET = process.env.R2_BUCKET || 'chat-privado-uploads'
// Use the jurisdiction-specific endpoint if provided, otherwise construct from account ID
const R2_ENDPOINT = process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '')

export const isR2Configured = !!(R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ENDPOINT)

let r2Client: S3Client | null = null
function getR2Client() {
  if (!r2Client && isR2Configured) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    })
  }
  return r2Client
}

/**
 * Upload a file to R2 (production) or local disk (development).
 */
export async function uploadFile(
  mediaPath: string,
  data: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  if (isR2Configured) {
    const client = getR2Client()!
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: mediaPath,
        Body: data,
        ContentType: contentType,
      }),
    )
  } else {
    const abs = path.join(UPLOAD_ROOT, mediaPath)
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, data)
  }
}

/**
 * Get a URL that the browser can use to display/download the file.
 * Uses the /api/media proxy endpoint which reads from R2.
 */
export async function getFileUrl(mediaPath: string): Promise<string> {
  if (isR2Configured) {
    return `/api/media?path=${encodeURIComponent(mediaPath)}`
  }
  return `/uploads/${mediaPath}`
}

/**
 * Get a file buffer from R2.
 */
export async function getR2FileBuffer(mediaPath: string): Promise<Buffer | null> {
  if (!isR2Configured) return null
  const client = getR2Client()!
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: mediaPath,
      }),
    )
    if (!response.Body) return null
    const chunks: Buffer[] = []
    for await (const chunk of response.Body as any) {
      chunks.push(Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  } catch (e: any) {
    if (e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) return null
    throw e
  }
}

/**
 * Delete a file from storage.
 */
export async function deleteFile(mediaPath: string): Promise<void> {
  if (isR2Configured) {
    const client = getR2Client()!
    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: R2_BUCKET,
          Key: mediaPath,
        }),
      )
    } catch {
      // ignore
    }
  } else {
    try {
      const abs = path.join(UPLOAD_ROOT, mediaPath)
      await fs.unlink(abs)
    } catch {
      // ignore
    }
  }
}

/**
 * Read a file from local disk (development mode).
 */
export async function readLocalFile(mediaPath: string): Promise<Buffer | null> {
  try {
    const abs = path.join(UPLOAD_ROOT, mediaPath)
    return await fs.readFile(abs)
  } catch {
    return null
  }
}

export async function getR2FileStream(mediaPath: string): Promise<NodeJS.ReadableStream | null> {
  return null
}
