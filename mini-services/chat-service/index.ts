import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  // Use the default socket.io path (/socket.io/) — matches the client.
  // The Caddy gateway forwards based on the XTransformPort query param,
  // not the path, so any path works as long as client and server agree.
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true,
})

/**
 * In-memory registry: uniqueId -> Set<socketId>
 * One user can be online on multiple devices simultaneously.
 */
const userSockets = new Map<string, Set<string>>()
const socketToUser = new Map<string, string>()

function getUserSockets(uniqueId: string): Set<string> {
  let set = userSockets.get(uniqueId)
  if (!set) {
    set = new Set()
    userSockets.set(uniqueId, set)
  }
  return set
}

function emitToUser(uniqueId: string, event: string, payload: any) {
  const set = userSockets.get(uniqueId)
  if (!set || set.size === 0) return
  for (const sid of Array.from(set)) {
    try {
      io.to(sid).emit(event, payload)
    } catch (err) {
      console.error('[ws] emit error', sid, err)
    }
  }
}

// Global error handlers — never let the process crash on a single bad socket
process.on('uncaughtException', (err) => {
  console.error('[chat-service] uncaughtException:', err)
})
process.on('unhandledRejection', (err) => {
  console.error('[chat-service] unhandledRejection:', err)
})

io.on('connection', (socket) => {
  console.log(`[ws] connected ${socket.id}`)

  // Per-socket error handler — prevents one bad client from killing the server
  socket.on('error', (err: Error) => {
    console.error(`[ws] socket error ${socket.id}:`, err.message)
  })

  socket.on('auth', (data: any) => {
    try {
      const uniqueId = typeof data === 'object' && data ? String(data.uniqueId ?? '') : ''
      if (!uniqueId) return
      socketToUser.set(socket.id, uniqueId)
      getUserSockets(uniqueId).add(socket.id)
      socket.join(`user:${uniqueId}`)
      console.log(`[ws] ${socket.id} authed as ${uniqueId}`)
    } catch (err) {
      console.error('[ws] auth handler error', err)
    }
  })

  // ---------------- Text / Photo / Voice ----------------
  socket.on('message:new', (payload: any) => {
    try {
      if (!payload || !payload.toUniqueId || !payload.fromUniqueId) return
      emitToUser(payload.toUniqueId, 'message:new', payload)
      // also echo to sender's other devices
      emitToUser(payload.fromUniqueId, 'message:new', payload)
    } catch (err) {
      console.error('[ws] message:new handler error', err)
    }
  })

  socket.on('message:read', (payload: any) => {
    try {
      if (!payload || !payload.toUniqueId) return
      emitToUser(payload.toUniqueId, 'message:read', payload)
    } catch (err) {
      console.error('[ws] message:read handler error', err)
    }
  })

  // ---------------- Typing indicator ----------------
  socket.on('typing', (payload: any) => {
    try {
      if (!payload || !payload.toUniqueId) return
      emitToUser(payload.toUniqueId, 'typing', { fromUniqueId: payload.fromUniqueId, isTyping: payload.isTyping })
    } catch (err) {
      console.error('[ws] typing handler error', err)
    }
  })

  // ---------------- Online status ----------------
  socket.on('presence:request', (payload: any) => {
    try {
      if (!payload || !payload.targetUniqueId || !payload.fromUniqueId) return
      const isOnline = (userSockets.get(payload.targetUniqueId)?.size ?? 0) > 0
      emitToUser(payload.fromUniqueId, 'presence:response', { targetUniqueId: payload.targetUniqueId, isOnline })
    } catch (err) {
      console.error('[ws] presence handler error', err)
    }
  })

  // ---------------- WebRTC signaling (voice/video calls) ----------------
  socket.on('call:offer', (payload: any) => {
    try {
      if (!payload || !payload.toUniqueId) return
      emitToUser(payload.toUniqueId, 'call:offer', {
        fromUniqueId: payload.fromUniqueId,
        fromName: payload.fromName,
        kind: payload.kind,
        offer: payload.offer,
      })
    } catch (err) {
      console.error('[ws] call:offer error', err)
    }
  })
  socket.on('call:answer', (payload: any) => {
    try {
      if (!payload || !payload.toUniqueId) return
      emitToUser(payload.toUniqueId, 'call:answer', { fromUniqueId: payload.fromUniqueId, answer: payload.answer })
    } catch (err) {
      console.error('[ws] call:answer error', err)
    }
  })
  socket.on('call:ice', (payload: any) => {
    try {
      if (!payload || !payload.toUniqueId) return
      emitToUser(payload.toUniqueId, 'call:ice', { fromUniqueId: payload.fromUniqueId, candidate: payload.candidate })
    } catch (err) {
      console.error('[ws] call:ice error', err)
    }
  })
  socket.on('call:end', (payload: any) => {
    try {
      if (!payload || !payload.toUniqueId) return
      emitToUser(payload.toUniqueId, 'call:end', { fromUniqueId: payload.fromUniqueId, reason: payload.reason })
    } catch (err) {
      console.error('[ws] call:end error', err)
    }
  })
  socket.on('call:decline', (payload: any) => {
    try {
      if (!payload || !payload.toUniqueId) return
      emitToUser(payload.toUniqueId, 'call:decline', { fromUniqueId: payload.fromUniqueId })
    } catch (err) {
      console.error('[ws] call:decline error', err)
    }
  })

  socket.on('disconnect', (reason: string) => {
    try {
      const uid = socketToUser.get(socket.id)
      if (uid) {
        const set = userSockets.get(uid)
        if (set) {
          set.delete(socket.id)
          if (set.size === 0) userSockets.delete(uid)
        }
        socketToUser.delete(socket.id)
      }
      console.log(`[ws] disconnected ${socket.id} (${reason})`)
    } catch (err) {
      console.error('[ws] disconnect handler error', err)
    }
  })
})

const PORT = 3003
httpServer.on('error', (err: NodeJS.ErrnoException) => {
  console.error('[chat-service] http server error:', err)
})

httpServer.listen(PORT, () => {
  console.log(`[chat-service] WebSocket server running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('[chat-service] SIGTERM received, shutting down...')
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  console.log('[chat-service] SIGINT received, shutting down...')
  httpServer.close(() => process.exit(0))
})
