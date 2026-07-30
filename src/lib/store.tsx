'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type CurrentUser = {
  id: string; uniqueId: string; username: string; firstName: string; lastName: string
  displayName?: string | null; role: 'user' | 'admin' | 'super_admin'
}
export type Friend = { displayName?: string | null; uniqueId: string; username: string; firstName: string; lastName: string; blocked?: boolean }
export type ChatSummary = { peer: Friend; lastMessage: any | null; unread: number }
export type ChatMessage = {
  id: string; type: 'text' | 'voice' | 'photo' | 'call'; content: string | null; mediaPath: string | null
  callKind?: string | null; callDuration?: number | null; callStatus?: string | null
  sentAt: string; readAt?: string | null; fromMe: boolean
  photoExpiresSeconds?: number | null; photoViewStartedAt?: string | null
}

type AppState = {
  user: CurrentUser | null; setUser: (u: CurrentUser | null) => void
  view: { kind: 'ai' } | { kind: 'app' }; setView: (v: any) => void
  tab: string; setTab: (t: any) => void
  activeChatPeerId: string | null; setActiveChat: (p: string | null) => void
  chats: ChatSummary[]; setChats: (c: ChatSummary[]) => void
  friends: Friend[]; setFriends: (f: Friend[]) => void
  messages: Record<string, ChatMessage[]>; setMessages: (p: string, m: ChatMessage[]) => void
  appendMessage: (p: string, m: ChatMessage) => void
  mergeMessages: (p: string, m: ChatMessage[]) => void
  markRead: (p: string, ids: string[]) => void
}

const AppContext = createContext<AppState>(null as any)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [view, setView] = useState<any>({ kind: 'ai' })
  const [tab, setTab] = useState<string>('chats')
  const [activeChatPeerId, setActiveChat] = useState<string | null>(null)
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [messages, setMessagesState] = useState<Record<string, ChatMessage[]>>({})

  const setMessages = useCallback((peerId: string, msgs: ChatMessage[]) => {
    setMessagesState(prev => ({ ...prev, [peerId]: msgs }))
  }, [])
  const appendMessage = useCallback((peerId: string, msg: ChatMessage) => {
    setMessagesState(prev => {
      const ex = prev[peerId] ?? []
      if (ex.some(m => m.id === msg.id)) return prev
      return { ...prev, [peerId]: [...ex, msg] }
    })
  }, [])
  const mergeMessages = useCallback((peerId: string, msgs: ChatMessage[]) => {
    setMessagesState(prev => {
      const ex = prev[peerId] ?? []
      const byId = new Map<string, ChatMessage>()
      for (const m of ex) byId.set(m.id, m)
      for (const m of msgs) {
        const p = byId.get(m.id)
        if (!p) byId.set(m.id, m)
        else byId.set(m.id, { ...p, readAt: m.readAt ?? p.readAt, photoViewStartedAt: m.photoViewStartedAt ?? p.photoViewStartedAt, photoExpiresSeconds: m.photoExpiresSeconds ?? p.photoExpiresSeconds })
      }
      return { ...prev, [peerId]: Array.from(byId.values()).sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()) }
    })
  }, [])
  const markRead = useCallback((peerId: string, ids: string[]) => {
    setMessagesState(prev => {
      const list = prev[peerId] ?? []
      return { ...prev, [peerId]: list.map(m => ids.includes(m.id) && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m) }
    })
  }, [])

  return (
    <AppContext.Provider value={{ user, setUser, view, setView, tab, setTab, activeChatPeerId, setActiveChat, chats, setChats, friends, setFriends, messages, setMessages, appendMessage, mergeMessages, markRead }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppStore<T = AppState>(selector?: (s: AppState) => T): T {
  const ctx = useContext(AppContext)
  if (!ctx) return {} as T
  if (selector) return selector(ctx)
  return ctx as unknown as T
}
