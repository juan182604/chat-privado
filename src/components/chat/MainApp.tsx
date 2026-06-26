'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { useRealtimePolling } from '@/lib/realtime-poll'
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

  useRealtimePolling()

  // Swipe-to-go-back
  useEffect(() => {
    if (!activeChatPeerId) return
    let startX = 0, startY = 0, isTracking = false
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches[0].clientX < 40) { startX = e.touches[0].clientX; startY = e.touches[0].clientY; isTracking = true }
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (!isTracking) return
      const dx = e.changedTouches[0].clientX - startX
      const dy = Math.abs(e.changedTouches[0].clientY - startY)
      if (dx > 80 && dx > dy * 2) setActiveChat(null)
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
          {isAdmin ? <TabButton active={tab === 'admin'} onClick={() => setTab('admin')} icon={<Shield className="w-5 h-5" />} label="Admin" />
          : <div />}
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
