'use client'

import { useEffect, useRef } from 'react'
import { useAppStore, ChatMessage } from '@/lib/store'

export function useRealtimePolling() {
  const user = useAppStore((s) => s.user)
  const setChats = useAppStore((s) => s.setChats)
  const setFriends = useAppStore((s) => s.setFriends)
  const mergeMessages = useAppStore((s) => s.mergeMessages)
  const activeChatPeerId = useAppStore((s) => s.activeChatPeerId)
  const markRead = useAppStore((s) => s.markRead)

  const lastPollRef = useRef<string>(new Date(0).toISOString())
  const activeChatRef = useRef<string | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inFlightRef = useRef(false)

  useEffect(() => { activeChatRef.current = activeChatPeerId }, [activeChatPeerId])

  useEffect(() => {
    if (!user) return
    console.log("[poll] starting polling for user", user.username)
    const poll = async () => {
      if (inFlightRef.current) return
      inFlightRef.current = true
      try {
        const since = lastPollRef.current
        const res = await fetch(`/api/messages/poll?_t=${Date.now()}&since=${encodeURIComponent(since)}`, { cache: 'no-store' as RequestCache })
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data.chats)) {
          setChats(data.chats)
          setFriends(data.chats.map((c: any) => c.peer))
        }
        const byPeer: Record<string, ChatMessage[]> = {}
        const incomingToMarkRead: Record<string, string[]> = {}
        for (const m of data.newMessages || []) {
          if (!m.peerUniqueId) continue
          if (!byPeer[m.peerUniqueId]) byPeer[m.peerUniqueId] = []
          byPeer[m.peerUniqueId].push({
            id: m.id, type: m.type, content: m.content, mediaPath: m.mediaPath,
            callKind: m.callKind, callDuration: m.callDuration, callStatus: m.callStatus,
            sentAt: m.sentAt, readAt: m.readAt, fromMe: m.fromMe,
            photoExpiresSeconds: m.photoExpiresSeconds, photoViewStartedAt: m.photoViewStartedAt,
          })
          if (!m.fromMe && !m.readAt && m.peerUniqueId === activeChatRef.current) {
            if (!incomingToMarkRead[m.peerUniqueId]) incomingToMarkRead[m.peerUniqueId] = []
            incomingToMarkRead[m.peerUniqueId].push(m.id)
          }
        }
        for (const [peerId, msgs] of Object.entries(byPeer)) mergeMessages(peerId, msgs)
        for (const [peerId, ids] of Object.entries(incomingToMarkRead)) {
          if (ids.length === 0) continue
          markRead(peerId, ids)
          fetch('/api/messages/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ peerUniqueId: peerId }) }).catch(() => {})
        }
        if (data.serverTime) lastPollRef.current = data.serverTime
      } catch {} finally { inFlightRef.current = false }
    }
    poll()
    pollTimerRef.current = setInterval(poll, 2000)
    return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current) }
  }, [user, setChats, setFriends, mergeMessages, markRead])
}
