'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Search, MessageCircle, UserPlus, RefreshCw } from 'lucide-react'
import { AddContactDialog } from '@/components/chat/AddContactDialog'

export function ChatList({ onOpenChat }: { onOpenChat: (peerId: string) => void }) {
  const user = useAppStore((s) => s.user)
  const [chats, setChats] = useState<any[]>([])
  const [filter, setFilter] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const loadChats = async () => {
    try {
      const res = await fetch('/api/messages/chats', { credentials: 'include' })
      const data = await res.json()
      if (Array.isArray(data.chats)) {
        setChats(data.chats)
        setLoaded(true)
      }
    } catch {}
  }

  // Load on mount AND on interval
  useEffect(() => {
    loadChats()
    const t = setInterval(loadChats, 3000)
    return () => clearInterval(t)
  }, [])

  // Also listen for custom event
  useEffect(() => {
    const handler = () => loadChats()
    window.addEventListener('nx:refresh-chats', handler)
    return () => window.removeEventListener('nx:refresh-chats', handler)
  }, [])

  const filtered = chats.filter((c) =>
    !filter || c.peer.username.includes(filter.toLowerCase()) || c.peer.uniqueId.includes(filter.toLowerCase()),
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-zinc-800/60 bg-zinc-950">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Chats</h1>
            <p className="text-[11px] text-zinc-500">Tu ID: <span className="font-mono text-emerald-400">{user?.uniqueId}</span></p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadChats} className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center" title="Actualizar">
              <RefreshCw className="w-4 h-4 text-zinc-300" />
            </button>
            <button onClick={() => setAddOpen(true)} className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center" title="Agregar contacto">
              <UserPlus className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-zinc-800/70 border border-zinc-700 rounded-full px-3 py-2">
          <Search className="w-4 h-4 text-zinc-500" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar…" className="bg-transparent flex-1 outline-none text-sm text-zinc-100" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            {loaded ? 'No tienes chats. Agrega un contacto con el botón +.' : 'Cargando…'}
          </div>
        ) : (
          <ul>
            {filtered.map((c) => (
              <li key={c.peer.uniqueId} onClick={() => onOpenChat(c.peer.uniqueId)} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 cursor-pointer border-b border-zinc-800/40">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shrink-0">{c.peer.firstName.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-zinc-100 truncate">{c.peer.displayName || c.peer.username}<span className="ml-2 text-[10px] text-zinc-500 font-mono">#{c.peer.uniqueId}</span></p>
                    <span className="text-[11px] text-zinc-500 shrink-0">{c.lastMessage ? new Date(c.lastMessage.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-sm text-zinc-400 truncate">{c.lastMessage ? (c.lastMessage.fromMe ? 'Tú: ' : '') + (c.lastMessage.type === 'text' ? c.lastMessage.content : c.lastMessage.type === 'voice' ? '🎙️' : c.lastMessage.type === 'photo' ? '📷' : '📞') : 'Sin mensajes'}</p>
                    {c.unread > 0 && <span className="bg-emerald-500 text-zinc-950 text-[11px] font-bold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center shrink-0">{c.unread}</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <AddContactDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}
