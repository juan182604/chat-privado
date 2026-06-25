'use client'

import { create } from 'zustand'

export type CurrentUser = {
  id: string
  uniqueId: string
  username: string
  firstName: string
  lastName: string
  displayName?: string | null
  role: 'user' | 'admin' | 'super_admin'
}

export type Friend = {
  displayName?: string | null
  uniqueId: string
  username: string
  firstName: string
  lastName: string
  blocked?: boolean
}

export type ChatSummary = {
  peer: Friend
  lastMessage: {
    type: string
    content: string | null
    sentAt: string
    fromMe: boolean
    callKind?: string | null
    callStatus?: string | null
  } | null
  unread: number
}

export type ChatMessage = {
  id: string
  type: 'text' | 'voice' | 'photo' | 'call'
  content: string | null
  mediaPath: string | null
  callKind?: string | null
  callDuration?: number | null
  callStatus?: string | null
  sentAt: string
  readAt?: string | null
  fromMe: boolean
  photoExpiresSeconds?: number | null
  photoViewStartedAt?: string | null
}

type AppState = {
  user: CurrentUser | null
  setUser: (u: CurrentUser | null) => void

  view:
    | { kind: 'ai' } // entry chat with AI
    | { kind: 'app' } // logged in, showing main UI
  setView: (v: AppState['view']) => void

  // App sub-navigation
  tab: 'chats' | 'contacts' | 'calls' | 'profile' | 'admin'
  setTab: (t: AppState['tab']) => void

  activeChatPeerId: string | null
  setActiveChat: (peerId: string | null) => void

  chats: ChatSummary[]
  setChats: (c: ChatSummary[]) => void

  friends: Friend[]
  setFriends: (f: Friend[]) => void

  messages: Record<string, ChatMessage[]> // keyed by peerUniqueId
  setMessages: (peerId: string, msgs: ChatMessage[]) => void
  appendMessage: (peerId: string, msg: ChatMessage) => void
  mergeMessages: (peerId: string, msgs: ChatMessage[]) => void
  markRead: (peerId: string, messageIds: string[]) => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (u) => set({ user: u }),
  view: { kind: 'ai' },
  setView: (v) => set({ view: v }),
  tab: 'chats',
  setTab: (t) => set({ tab: t }),
  activeChatPeerId: null,
  setActiveChat: (peerId) => set({ activeChatPeerId: peerId }),
  chats: [],
  setChats: (c) => set({ chats: c }),
  friends: [],
  setFriends: (f) => set({ friends: f }),
  messages: {},
  setMessages: (peerId, msgs) =>
    set((s) => ({ messages: { ...s.messages, [peerId]: msgs } })),
  appendMessage: (peerId, msg) =>
    set((s) => {
      const existing = s.messages[peerId] ?? []
      if (existing.some((m) => m.id === msg.id)) return s
      // Insert in chronological order
      const next = [...existing, msg].sort(
        (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
      )
      return { messages: { ...s.messages, [peerId]: next } }
    }),
  mergeMessages: (peerId, msgs) =>
    set((s) => {
      const existing = s.messages[peerId] ?? []
      const byId = new Map<string, ChatMessage>()
      for (const m of existing) byId.set(m.id, m)
      for (const m of msgs) {
        const prev = byId.get(m.id)
        if (!prev) {
          byId.set(m.id, m)
        } else {
          // Merge: prefer the version with the most "advanced" state.
          // - readAt: prefer the non-null one
          // - photoViewStartedAt: prefer the non-null one (timer started)
          // - photoExpiresSeconds: prefer the non-null one (in case the server sent it later)
          byId.set(m.id, {
            ...prev,
            readAt: m.readAt ?? prev.readAt,
            photoViewStartedAt: m.photoViewStartedAt ?? prev.photoViewStartedAt,
            photoExpiresSeconds: m.photoExpiresSeconds ?? prev.photoExpiresSeconds,
          })
        }
      }
      const next = Array.from(byId.values()).sort(
        (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
      )
      return { messages: { ...s.messages, [peerId]: next } }
    }),
  markRead: (peerId, messageIds) =>
    set((s) => {
      const list = s.messages[peerId] ?? []
      const next = list.map((m) =>
        messageIds.includes(m.id) && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m,
      )
      return { messages: { ...s.messages, [peerId]: next } }
    }),
}))
