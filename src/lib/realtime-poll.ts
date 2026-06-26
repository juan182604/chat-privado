'use client'

import { useEffect, useRef } from 'react'
import { useAppStore, ChatMessage } from '@/lib/store'

/**
 * Global real-time polling hook.
 * Replaces socket.io with HTTP polling every 2 seconds.
 *
 * - Fetches /api/messages/poll?since=<lastPoll>
 * - Updates chats list + appends new messages to the store
 * - When a new incoming message arrives for the active chat, marks it as read
 */
export function useRealtimePolling() {
  const { user, setChats, setFriends, mergeMessages, activeChatPeerId, markRead } = useAppStore()
  const { user } = useAppStore()
  const lastPollRef = useRef<string>(new Date(0).toISOString())
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inFlightRef = useRef(false)

  // Keep ref of active chat to avoid stale closure
  useEffect(() => {
    activeChatRef.current = activeChatPeerId
  }, [activeChatPeerId])

  useEffect(() => {
    if (!user) return

    const poll = async () => {
      if (inFlightRef.current) return
      inFlightRef.current = true
      try {
        const since = lastPollRef.current
        // cache:'no-store' + timestamp defeat any browser/CDN cache, so
        // messages and chats are always fetched fresh from the database.
        const res = await fetch(
          `/api/messages/poll?_t=${Date.now()}&since=${encodeURIComponent(since)}`,
          { cache: 'no-store' as RequestCache },
        )
        if (!res.ok) return
        const data = await res.json()

        // Update chats list + friends
        if (Array.isArray(data.chats)) {
          setChats(data.chats)
          setFriends(data.chats.map((c: any) => c.peer))
        }

        // Group new messages by peer
        const byPeer: Record<string, ChatMessage[]> = {}
        const incomingToMarkRead: Record<string, string[]> = {}

        for (const m of data.newMessages || []) {
          if (!m.peerUniqueId) continue
          if (!byPeer[m.peerUniqueId]) byPeer[m.peerUniqueId] = []
          byPeer[m.peerUniqueId].push({
            id: m.id,
            type: m.type,
            content: m.content,
            mediaPath: m.mediaPath,
            callKind: m.callKind,
            callDuration: m.callDuration,
            callStatus: m.callStatus,
            sentAt: m.sentAt,
            readAt: m.readAt,
            fromMe: m.fromMe,
            photoExpiresSeconds: m.photoExpiresSeconds,
            photoViewStartedAt: m.photoViewStartedAt,
          })
          // If this is an incoming unread message for the active chat, queue it for read marking
          if (!m.fromMe && !m.readAt && m.peerUniqueId === activeChatRef.current) {
            if (!incomingToMarkRead[m.peerUniqueId]) incomingToMarkRead[m.peerUniqueId] = []
            incomingToMarkRead[m.peerUniqueId].push(m.id)
          }
        }

        // Merge each peer's new messages into the store
        for (const [peerId, msgs] of Object.entries(byPeer)) {
          mergeMessages(peerId, msgs)
        }

        // Mark read for incoming messages in the active chat
        for (const [peerId, ids] of Object.entries(incomingToMarkRead)) {
          if (ids.length === 0) continue
          markRead(peerId, ids)
          // Fire-and-forget API call to mark as read on server
          fetch('/api/messages/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ peerUniqueId: peerId }),
          }).catch(() => {})
        }

        // Update the "since" cursor for the next poll
        if (data.serverTime) {
          lastPollRef.current = data.serverTime
        }
      } catch (e) {
        // network error - keep going, will retry next interval
      } finally {
        inFlightRef.current = false
      }
    }

    // Initial poll immediately, then every 2 seconds
    poll()
    pollTimerRef.current = setInterval(poll, 2000)

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [user, setChats, setFriends, mergeMessages, markRead])
}
