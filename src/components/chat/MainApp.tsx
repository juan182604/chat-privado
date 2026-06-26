'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { ChatList } from '@/components/chat/ChatList'
import { ChatView } from '@/components/chat/ChatView'
import { ContactsList } from '@/components/chat/ContactsList'
import { ProfileView } from '@/components/chat/ProfileView'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { CallOverlay } from '@/components/chat/CallOverlay'
import { MessageCircle, Users, Shield, User } from 'lucide-react'

export function MainApp() {
  const user = useAppStore((s) => s.user)
  const tab = useAppStore((s) => s.tab)
  const setTab = useAppStore((s) => s.setTab)
  const activeChatPeerId = useAppStore((s) => s.activeChatPeerId)
  const setActiveChat = useAppStore((s) => s.setActiveChat)
  const setChats = useAppStore((s) => s.setChats)
  const setFriends = useAppStore((s) => s.setFriends)
  const mergeMessages = useAppStore((s) => s.mergeMessages)
  const markRead = useAppStore((s) => s.markRead)

  // Polling directly in MainApp (not in a separate hook)
  useEffect(() => {
    if (!user) return
    
    let inFlight = false
    let lastPoll = new Date(0).toISOString()
    
    const poll = async () => {
      if (inFlight) return
      inFlight = true
      try {
        const res = await fetch(`/api/messages/poll?_t=${Date.now()}&since=${encodeURIComponent(lastPoll)}`, { cache: 'no-store' as RequestCache })
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data.chats)) {
          setChats(data.chats)
          setFriends(data.chats.map((c: any) => c.peer))
        }
        if (data.serverTime) lastPoll = data.serverTime
        // Process new messages
        if (data.newMessages && data.newMessages.length > 0) {
          for (const m of data.newMessages) {
            if (!m.peerUniqueId) continue
            mergeMessages(m.peerUniqueId, {
              id: m.id, type: m.type, content: m.content, mediaPath: m.mediaPath,
              callKind: m.callKind, callDuration: m.callDuration, callStatus: m.callStatus,
              sentAt: m.sentAt, readAt: m.readAt, fromMe: m.fromMe,
              photoExpiresSeconds: m.photoExpiresSeconds, photoViewStartedAt: m.photoViewStartedAt,
            })
          }
        }
      } catch {} finally { inFlight = false }
    }
    
    poll() // Initial poll
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [user, setChats, setFriends, mergeMessages, markRead])

  // Swipe-to-go-back
  useEffect(() => {
    if (!activeChatPeerId) return
    let startX = 0, isTracking = false
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches[0].clientX < 40) { startX = e.touches[0].clientX; isTracking = true }
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (!isTracking) return
      if (e.changedTouches[0].clientX - startX > 80) setActiveChat(null)
      isTracking = false
    }
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => { window.removeEventListener('touchstart', onTouchStart); window.removeEventListener('touchend', onTouchEnd) }
  }, [activeChatPeerId, setActiveChat])

  if (!user) return null
  const isAdmin = user.role === 'admin' || user.role === 'super_admin'
  const inChat = tab === 'chats' && activeChatPeerId

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 relative">
      <div className="flex-1 overflow-hidden relative">
        {inChat ? <ChatView peerId={activeChatPeerId!} onBack={() => setActiveChat(null)} />
        : tab === 'chats' ? <ChatList onOpenChat={(id) => setActiveChat(id)} />
        : tab === 'contacts' ? <ContactsList onOpenChat={(id) => { setActiveChat(id); setTab('chats') }} />
        : tab === 'profile' ? <ProfileView />
        : tab === 'admin' ? <AdminPanel />
        : null}
      </div>
      {!inChat && (
        <nav className="border-t border-zinc-800/60 bg-zinc-950 grid grid-cols-4">
          <TabButton active={tab === 'chats'} onClick={() => setTab('chats')} icon={<MessageCircle className="w-5 h-5" />} label="Chats" />
          <TabButton active={tab === 'contacts'} onClick={() => setTab('contacts')} icon={<Users className="w-5 h-5" />} label="Contactos" />
          {isAdmin ? <TabButton active={tab === 'admin'} onClick={() => setTab('admin')} icon={<Shield className="w-5 h-5" />} label="Admin" /> : <div />}
          <TabButton active={tab === 'profile'} onClick={() => setTab('profile')} icon={<User className="w-5 h-5" />} label="Perfil" />
        </nav>
      )}
      <CallOverlay />
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 py-2 ${active ? 'text-emerald-400' : 'text-zinc-500'}`}>
      {icon}<span className="text-[10px]">{label}</span>
    </button>
  )
}
