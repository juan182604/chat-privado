'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { useShallow } from 'zustand/react/shallow'
import { useRealtimePolling } from '@/lib/realtime-poll'
import { ChatList } from '@/components/chat/ChatList'
import { ChatView } from '@/components/chat/ChatView'
import { ContactsList } from '@/components/chat/ContactsList'
import { ProfileView } from '@/components/chat/ProfileView'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { CallOverlay } from '@/components/chat/CallOverlay'
import { MessageCircle, Users, Shield, User, ArrowLeft } from 'lucide-react'

export function MainApp() {
  const { user, tab, setTab, activeChatPeerId, setActiveChat } = useAppStore(useShallow((s) => ({
    user: s.user,
    tab: s.tab,
    setTab: s.setTab,
    activeChatPeerId: s.activeChatPeerId,
    setActiveChat: s.setActiveChat,
  })))

  // Wire up realtime polling
  useRealtimePolling()

  // Swipe-to-go-back gesture: swipe right on the left edge to exit chat
  useEffect(() => {
    if (!activeChatPeerId) return
    let startX = 0
    let startY = 0
    let isTracking = false

    const onTouchStart = (e: TouchEvent) => {
      // Only track if the touch starts in the left 40px of the screen
      if (e.touches[0].clientX < 40) {
        startX = e.touches[0].clientX
        startY = e.touches[0].clientY
        isTracking = true
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!isTracking) return
      const endX = e.changedTouches[0].clientX
      const endY = e.changedTouches[0].clientY
      const dx = endX - startX
      const dy = Math.abs(endY - startY)
      // Swipe right: dx > 80 and horizontal movement > vertical
      if (dx > 80 && dx > dy * 2) {
        setActiveChat(null)
      }
      isTracking = false
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [activeChatPeerId, setActiveChat])

  if (!user) return null

  const isAdmin = user.role === 'admin' || user.role === 'super_admin'
  const inChat = tab === 'chats' && activeChatPeerId

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 relative">

      <div className="flex-1 overflow-hidden relative">
        {inChat ? (
          <ChatView peerId={activeChatPeerId!} onBack={() => setActiveChat(null)} />
        ) : tab === 'chats' ? (
          <ChatList onOpenChat={(id) => setActiveChat(id)} />
        ) : tab === 'contacts' ? (
          <ContactsList onOpenChat={(id) => { setActiveChat(id); setTab('chats') }} />
        ) : tab === 'profile' ? (
          <ProfileView />
        ) : tab === 'admin' ? (
          <AdminPanel />
        ) : null}
      </div>

      {/* Bottom nav (hidden when inside a chat) */}
      {!inChat && (
        <nav className="border-t border-zinc-800/60 bg-zinc-950 grid grid-cols-4 shrink-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 4px)' }}>
          <TabButton
            active={tab === 'chats'}
            onClick={() => setTab('chats')}
            icon={<MessageCircle className="w-5 h-5" />}
            label="Chats"
          />
          <TabButton
            active={tab === 'contacts'}
            onClick={() => setTab('contacts')}
            icon={<Users className="w-5 h-5" />}
            label="Contactos"
          />
          {isAdmin ? (
            <TabButton
              active={tab === 'admin'}
              onClick={() => setTab('admin')}
              icon={<Shield className="w-5 h-5" />}
              label="Admin"
            />
          ) : (
            <TabButton
              active={false}
              onClick={() => {}}
              icon={<div className="w-5 h-5" />}
              label=""
              disabled
              hidden
            />
          )}
          <TabButton
            active={tab === 'profile'}
            onClick={() => setTab('profile')}
            icon={<User className="w-5 h-5" />}
            label="Perfil"
          />
        </nav>
      )}

      {/* Call overlay */}
      <CallOverlay />
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  disabled,
  hidden,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  disabled?: boolean
  hidden?: boolean
}) {
  if (hidden) return <div />
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 py-2 transition-colors ${
        active ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}
