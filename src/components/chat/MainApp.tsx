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
import { MessageCircle, Users, Shield, User, ArrowLeft } from 'lucide-react'

export function MainApp() {
  const user = useAppStore((s) => s.user)
  const tab = useAppStore((s) => s.tab)
  const setTab = useAppStore((s) => s.setTab)
  const activeChatPeerId = useAppStore((s) => s.activeChatPeerId)
  const setActiveChat = useAppStore((s) => s.setActiveChat)

  // Wire up realtime polling (replaces socket.io)
  useRealtimePolling()

  // Listen for chat refresh events
  useEffect(() => {
    const handler = () => {
      // Trigger refresh by changing tab to chats momentarily? Actually just emit; ChatList polls itself.
    }
    window.addEventListener('nx:refresh-chats', handler)
    return () => window.removeEventListener('nx:refresh-chats', handler)
  }, [])

  if (!user) return null

  const isAdmin = user.role === 'admin' || user.role === 'super_admin'
  const inChat = tab === 'chats' && activeChatPeerId

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 max-w-2xl mx-auto relative">
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
        <nav className="border-t border-zinc-800/60 bg-zinc-950 grid grid-cols-4 safe-bottom">
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

      {/* Call overlay (renders on top when there's an active call) */}
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
