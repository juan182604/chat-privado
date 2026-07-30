'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAppStore, ChatMessage } from '@/lib/store'

let socketSingleton: Socket | null = null
let authenticatedUniqueId: string | null = null

/**
 * Get the shared socket. Creates + connects on first call.
 * Re-emits `auth` automatically on every (re)connection via the
 * `authOnConnect` listener installed in useRealtimeSocket.
 */
export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null
  if (socketSingleton) {
    if (!socketSingleton.connected) {
      socketSingleton.connect()
    }
    return socketSingleton
  }
  socketSingleton = io({
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    timeout: 20000,
    // The XTransformPort query tells the Caddy gateway to forward to port 3003
    query: { XTransformPort: '3003' },
  })
  return socketSingleton
}

/**
 * Authenticates the socket with the user's uniqueId and wires up
 * real-time message + call signaling handlers.
 *
 * The socket is a singleton across the app lifetime. We only attach the
 * global `connect` listener once so we re-emit `auth` on every reconnect.
 * Message/typing/call handlers are scoped to this user's session.
 */
export function useRealtimeSocket() {
  const user = useAppStore((s) => s.user)
  const appendMessage = useAppStore((s) => s.appendMessage)
  const markRead = useAppStore((s) => s.markRead)
  const [callEvent, setCallEvent] = useState<any>(null)
  const [typingPeer, setTypingPeer] = useState<{ peerId: string; isTyping: boolean } | null>(null)
  const userRef = useRef(user)

  // Keep userRef in sync so the connect listener always has the latest user
  useEffect(() => {
    userRef.current = user
  }, [user])

  // One-time global socket wiring (only when first user logs in)
  useEffect(() => {
    if (!user) return
    const socket = getSocket()
    if (!socket) return

    const onConnect = () => {
      const u = userRef.current
      if (u) {
        socket.emit('auth', { uniqueId: u.uniqueId })
        authenticatedUniqueId = u.uniqueId
        console.log('[realtime] connected + authed as', u.uniqueId)
      }
    }

    const onDisconnect = (reason: string) => {
      console.log('[realtime] disconnected:', reason)
    }

    const onConnectError = (err: Error) => {
      console.warn('[realtime] connect_error:', err.message)
    }

    if (socket.connected) onConnect()
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
    }
  }, [user])

  // Message + signaling handlers (also tied to user presence)
  useEffect(() => {
    if (!user) return
    const socket = getSocket()
    if (!socket) return

    const onMessageNew = (payload: { toUniqueId: string; fromUniqueId: string; message: any }) => {
      console.log('[realtime] message:new', payload)
      const msg: ChatMessage = {
        id: payload.message.id,
        type: payload.message.type,
        content: payload.message.content,
        mediaPath: payload.message.mediaPath,
        callKind: payload.message.callKind,
        callDuration: payload.message.callDuration,
        callStatus: payload.message.callStatus,
        sentAt: payload.message.sentAt,
        fromMe: payload.message.fromUniqueId === user.uniqueId,
      }
      const peerId = msg.fromMe ? payload.toUniqueId : payload.fromUniqueId
      appendMessage(peerId, msg)
      // Tell the chat list to refresh so unread counts and preview update
      window.dispatchEvent(new Event('nx:refresh-chats'))
    }

    const onMessageRead = (payload: { fromUniqueId: string; messageIds: string[] }) => {
      markRead(payload.fromUniqueId, payload.messageIds)
    }

    const onTyping = ({ fromUniqueId, isTyping }: { fromUniqueId: string; isTyping: boolean }) => {
      setTypingPeer({ peerId: fromUniqueId, isTyping })
    }

    const onCallOffer = (e: any) => setCallEvent({ kind: 'offer', ...e })
    const onCallAnswer = (e: any) => setCallEvent({ kind: 'answer', ...e })
    const onCallIce = (e: any) => setCallEvent({ kind: 'ice', ...e })
    const onCallEnd = (e: any) => setCallEvent({ kind: 'end', ...e })
    const onCallDecline = (e: any) => setCallEvent({ kind: 'decline', ...e })

    socket.on('message:new', onMessageNew)
    socket.on('message:read', onMessageRead)
    socket.on('typing', onTyping)
    socket.on('call:offer', onCallOffer)
    socket.on('call:answer', onCallAnswer)
    socket.on('call:ice', onCallIce)
    socket.on('call:end', onCallEnd)
    socket.on('call:decline', onCallDecline)

    return () => {
      socket.off('message:new', onMessageNew)
      socket.off('message:read', onMessageRead)
      socket.off('typing', onTyping)
      socket.off('call:offer', onCallOffer)
      socket.off('call:answer', onCallAnswer)
      socket.off('call:ice', onCallIce)
      socket.off('call:end', onCallEnd)
      socket.off('call:decline', onCallDecline)
    }
  }, [user, appendMessage, markRead])

  return { callEvent, setCallEvent, typingPeer }
}
