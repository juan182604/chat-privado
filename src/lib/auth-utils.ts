import { createHash, randomBytes, timingSafeEqual } from 'crypto'

/**
 * Hash a 6-digit PIN using SHA-256 with a per-user salt.
 * Returns `salt$hash` format.
 */
export function hashPin(pin: string, salt?: string): string {
  const s = salt ?? randomBytes(16).toString('hex')
  const hash = createHash('sha256')
    .update(s + ':' + pin)
    .digest('hex')
  return `${s}$${hash}`
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split('$')
  if (!salt || !hash) return false
  const computed = createHash('sha256')
    .update(salt + ':' + pin)
    .digest('hex')
  try {
    return timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'))
  } catch {
    return false
  }
}

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

/**
 * Generate a unique 6-character ID using lowercase letters + digits.
 * Collides very rarely; caller should retry on unique-constraint error.
 */
export function generateUnique6CharId(): string {
  const bytes = randomBytes(6)
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += ID_ALPHABET[bytes[i] % ID_ALPHABET.length]
  }
  return out
}

/**
 * Generate a random session token.
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Compute expiry: now + 10 hours.
 */
export function plus10Hours(from: Date = new Date()): Date {
  return new Date(from.getTime() + 10 * 60 * 60 * 1000)
}

/**
 * Compute expiry for an unread message: sentAt + 10h.
 * For a read message: readAt + 10h (recomputed when message is marked read).
 */
export function computeExpiry(sentAt: Date, readAt: Date | null): Date {
  const base = readAt ?? sentAt
  return plus10Hours(base)
}
