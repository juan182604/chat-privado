'use client'

import { useState } from 'react'
import { useAppStore, ChatSummary } from '@/lib/store'
import { Search, MessageCircle, UserPlus } from 'lucide-react'
import { AddContactDialog } from '@/components/chat/AddContactDialog'

export function ChatList({ onOpenChat }: { onOpenChat: (peerId: string) => void }) {
  const { user, chats, setChats } = useAppStore()
      const [filter, setFilter] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const filtered = chats.filter(
    (c) =>
      !filter ||
      c.peer.username.includes(filter.toLowerCase()) ||
      c.peer.uniqueId.includes(filter.toLowerCase()),
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-zinc-800/60 ">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Chats</h1>
            <p className="text-[11px] text-zinc-500">Tu ID: <span className="font-mono text-emerald-400">{user?.uniqueId}</span></p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center transition-colors"
            title="Agregar contacto por ID"
          >
            <UserPlus className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="flex items-center gap-2 bg-zinc-800/70 border border-zinc-700 rounded-full px-3 py-2">
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar por ID o usuario…"
            className="bg-transparent flex-1 outline-none text-sm text-zinc-100"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            {chats.length === 0
              ? 'No tienes chats. Agrega un contacto con el botón +.'
              : 'Sin resultados.'}
          </div>
        ) : (
          <ul>
            {filtered.map((c) => (
              <ChatRow key={c.peer.uniqueId} chat={c} onClick={() => onOpenChat(c.peer.uniqueId)} />
            ))}
          </ul>
        )}
      </div>

      <AddContactDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}

function ChatRow({ chat, onClick }: { chat: ChatSummary; onClick: () => void }) {
  const preview = () => {
    const lm = chat.lastMessage
    if (!lm) return 'Sin mensajes aún'
    const prefix = lm.fromMe ? 'Tú: ' : ''
    if (lm.type === 'text') return prefix + (lm.content ?? '')
    if (lm.type === 'voice') return prefix + '🎙️ Nota de voz'
    if (lm.type === 'photo') return prefix + '📷 Foto'
    if (lm.type === 'call') {
      return prefix + (lm.callKind === 'video' ? '📹 Videollamada' : '📞 Llamada')
    }
    return prefix
  }
  const time = () => {
    if (!chat.lastMessage) return ''
    const d = new Date(chat.lastMessage.sentAt)
    const now = new Date()
    const sameDay = d.toDateString() === now.toDateString()
    if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
  return (
    <li
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 cursor-pointer border-b border-zinc-800/40"
    >
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
        {chat.peer.firstName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-zinc-100 truncate">
            {chat.peer.displayName || chat.peer.username}
            <span className="ml-2 text-[10px] text-zinc-500 font-mono">#{chat.peer.uniqueId}</span>
          </p>
          <span className="text-[11px] text-zinc-500 shrink-0">{time()}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-sm text-zinc-400 truncate">{preview()}</p>
          {chat.unread > 0 && (
            <span className="bg-emerald-500 text-zinc-950 text-[11px] font-bold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center shrink-0">
              {chat.unread}
            </span>
          )}
        </div>
      </div>
    </li>
  )
}
