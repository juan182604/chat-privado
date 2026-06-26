'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

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
  view: { kind: 'ai' } | { kind: 'app' }
  setView: (v: { kind: 'ai' } | { kind: 'app' }) => void
  tab: 'chats' | 'contacts' | 'calls' | 'profile' | 'admin'
  setTab: (t: 'chats' | 'contacts' | 'calls' | 'profile' | 'admin') => void
  activeChatPeerId: string | null
  setActiveChat: (peerId: string | null) => void
  chats: ChatSummary[]
  setChats: (c: ChatSummary[]) => void
  friends: Friend[]
  setFriends: (f: Friend[]) => void
  messages: Record<string, ChatMessage[]>
  setMessages: (peerId: string, msgs: ChatMessage[]) => void
  appendMessage: (peerId: string, msg: ChatMessage) => void
  markRead: (peerId: string, messageIds: string[]) => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [view, setView] = useState<{ kind: 'ai' } | { kind: 'app' }>({ kind: 'ai' })
  const [tab, setTab] = useState<'chats' | 'contacts' | 'calls' | 'profile' | 'admin'>('chats')
  const [activeChatPeerId, setActiveChat] = useState<string | null>(null)
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [messages, setMessagesState] = useState<Record<string, ChatMessage[]>>({})

  const setMessages = useCallback((peerId: string, msgs: ChatMessage[]) => {
    setMessagesState(prev => ({ ...prev, [peerId]: msgs }))
  }, [])

  const appendMessage = useCallback((peerId: string, msg: ChatMessage) => {
    setMessagesState(prev => {
      const existing = prev[peerId] ?? []
      if (existing.some(m => m.id === msg.id)) return prev
      return { ...prev, [peerId]: [...existing, msg] }
    })
  }, [])

  const markRead = useCallback((peerId: string, messageIds: string[]) => {
    setMessagesState(prev => {
      const list = prev[peerId] ?? []
      const next = list.map(m =>
        messageIds.includes(m.id) && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m
      )
      return { ...prev, [peerId]: next }
    })
  }, [])

  return (
    <AppContext.Provider value={{
      user, setUser, view, setView, tab, setTab,
      activeChatPeerId, setActiveChat, chats, setChats,
      friends, setFriends, messages, setMessages, appendMessage, markRead,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppStore(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppStore must be used within AppProvider')
  return ctx
}
