import { NextRequest, NextResponse } from 'next/server'
import { query, execute, generateId } from '@/lib/db-client'
import { getSession } from '@/lib/session'
import { hashPin } from '@/lib/auth-utils'
import { jsonResponseNoCache } from '@/lib/no-cache'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return jsonResponseNoCache({ error: 'No autenticado' }, { status: 401 })
  if (session.user.role !== 'admin' && session.user.role !== 'super_admin') {
    return jsonResponseNoCache({ error: 'Acceso denegado' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return jsonResponseNoCache({ error: 'JSON inválido' }, { status: 400 })
  const targetId = (body.targetId ?? '').toString()
  const action = (body.action ?? '').toString()
  const reason = body.reason ? String(body.reason).slice(0, 500) : null

  const targetRows = await query(`SELECT * FROM "User" WHERE id = ?`, [targetId])
  if (targetRows.length === 0) {
    return jsonResponseNoCache({ error: 'Usuario no encontrado' }, { status: 404 })
  }
  const target = targetRows[0]
  const isSuper = session.user.role === 'super_admin'

  if (action === 'promote_admin' || action === 'demote_admin') {
    if (!isSuper) {
      return jsonResponseNoCache({ error: 'Solo el super admin puede gestionar roles' }, { status: 403 })
    }
  }
  if (action === 'delete' || action === 'block') {
    if (!isSuper && (target.role === 'admin' || target.role === 'super_admin')) {
      return jsonResponseNoCache({ error: 'No tienes permiso sobre otros admins' }, { status: 403 })
    }
    if (target.id === session.user.id) {
      return jsonResponseNoCache({ error: 'No puedes modificarte a ti mismo' }, { status: 400 })
    }
  }

  const now = new Date().toISOString()
  const auditId = generateId()

  if (action === 'block') {
    await execute(
      `UPDATE "User" SET blocked = 1, "blockReason" = ?, "blockedAt" = ?, "updatedAt" = ? WHERE id = ?`,
      [reason, now, now, target.id],
    )
    await execute(`DELETE FROM "Session" WHERE "userId" = ?`, [target.id])
    await execute(
      `INSERT INTO "AuditLog" (id, "actorId", "targetUserId", action, reason, "createdAt") VALUES (?, ?, ?, ?, ?, ?)`,
      [auditId, session.user.id, target.id, 'block', reason, now],
    )
    return jsonResponseNoCache({ ok: true })
  }

  if (action === 'unblock') {
    await execute(
      `UPDATE "User" SET blocked = 0, "blockReason" = NULL, "blockedAt" = NULL, "updatedAt" = ? WHERE id = ?`,
      [now, target.id],
    )
    await execute(
      `INSERT INTO "AuditLog" (id, "actorId", "targetUserId", action, reason, "createdAt") VALUES (?, ?, ?, ?, ?, ?)`,
      [auditId, session.user.id, target.id, 'unblock', reason, now],
    )
    return jsonResponseNoCache({ ok: true })
  }

  if (action === 'delete') {
    await execute(`DELETE FROM "User" WHERE id = ?`, [target.id])
    await execute(
      `INSERT INTO "AuditLog" (id, "actorId", "targetUserId", action, reason, "createdAt") VALUES (?, ?, ?, ?, ?, ?)`,
      [auditId, session.user.id, null, 'delete', reason ? `${target.username} (${target.uniqueId}): ${reason}` : `${target.username} (${target.uniqueId})`, now],
    )
    return jsonResponseNoCache({ ok: true })
  }

  if (action === 'promote_admin') {
    if (target.role === 'super_admin') {
      return jsonResponseNoCache({ error: 'No se puede modificar el super admin' }, { status: 400 })
    }
    await execute(`UPDATE "User" SET role = 'admin', "updatedAt" = ? WHERE id = ?`, [now, target.id])
    await execute(
      `INSERT INTO "AuditLog" (id, "actorId", "targetUserId", action, reason, "createdAt") VALUES (?, ?, ?, ?, ?, ?)`,
      [auditId, session.user.id, target.id, 'promote_admin', reason, now],
    )
    return jsonResponseNoCache({ ok: true })
  }

  if (action === 'promote_super_admin') {
    // Only super_admin can promote to super_admin
    if (session.user.role !== 'super_admin') {
      return jsonResponseNoCache({ error: 'Solo el super admin puede dar permisos de super admin' }, { status: 403 })
    }
    if (target.role === 'super_admin') {
      return jsonResponseNoCache({ error: 'Este usuario ya es super admin' }, { status: 400 })
    }
    if (target.id === session.user.id) {
      return jsonResponseNoCache({ error: 'No puedes darte super admin a ti mismo' }, { status: 400 })
    }
    await execute(`UPDATE "User" SET role = 'super_admin', "updatedAt" = ? WHERE id = ?`, [now, target.id])
    await execute(
      `INSERT INTO "AuditLog" (id, "actorId", "targetUserId", action, reason, "createdAt") VALUES (?, ?, ?, ?, ?, ?)`,
      [auditId, session.user.id, target.id, 'promote_super_admin', reason, now],
    )
    return jsonResponseNoCache({ ok: true })
  }

  if (action === 'demote_admin') {
    if (target.role === 'super_admin') {
      // Only super_admin can demote another super_admin
      if (session.user.role !== 'super_admin') {
        return jsonResponseNoCache({ error: 'Solo el super admin puede quitar permisos de super admin' }, { status: 403 })
      }
      if (target.id === session.user.id) {
        return jsonResponseNoCache({ error: 'No puedes quitarte super admin a ti mismo' }, { status: 400 })
      }
    }
    await execute(`UPDATE "User" SET role = 'user', "updatedAt" = ? WHERE id = ?`, [now, target.id])
    await execute(
      `INSERT INTO "AuditLog" (id, "actorId", "targetUserId", action, reason, "createdAt") VALUES (?, ?, ?, ?, ?, ?)`,
      [auditId, session.user.id, target.id, 'demote_admin', reason, now],
    )
    return jsonResponseNoCache({ ok: true })
  }

  if (action === 'reset_pin') {
    const newPin = (body.newPin ?? '').toString()
    if (!/^\d{6}$/.test(newPin)) {
      return jsonResponseNoCache({ error: 'El PIN debe ser 6 dígitos' }, { status: 400 })
    }
    const pinHash = hashPin(newPin)
    await execute(
      `UPDATE "User" SET "pinHash" = ?, "updatedAt" = ? WHERE id = ?`,
      [pinHash, now, target.id],
    )
    // Delete all sessions for this user so they must login with the new PIN
    await execute(`DELETE FROM "Session" WHERE "userId" = ?`, [target.id])
    await execute(
      `INSERT INTO "AuditLog" (id, "actorId", "targetUserId", action, reason, "createdAt") VALUES (?, ?, ?, ?, ?, ?)`,
      [auditId, session.user.id, target.id, 'reset_pin', `PIN reseteado para ${target.username}`, now],
    )
    return jsonResponseNoCache({ ok: true, newPin })
  }

  return jsonResponseNoCache({ error: 'Acción inválida' }, { status: 400 })
}
