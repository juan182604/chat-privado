'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Trash2, MessageCircle, Users } from 'lucide-react'

export function ContactsList({ onOpenChat }: { onOpenChat: (peerId: string) => void }) {
  const user = useAppStore((s) => s.user)
  const [friends, setFriends] = useState<any[]>([])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/friends/list')
      const data = await res.json()
      if (Array.isArray(data.friends)) setFriends(data.friends)
    } catch {}
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [load])

  const remove = async (uniqueId: string) => {
    if (!confirm('¿Eliminar este contacto?')) return
    await fetch('/api/friends/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUniqueId: uniqueId }) })
    setFriends(friends.filter((f) => f.uniqueId !== uniqueId))
  }

  return (
    <div className="flex flex-col h-full">
      <header className="px-4 py-3 border-b border-zinc-800/60 bg-zinc-950">
        <h1 className="text-xl font-bold text-zinc-100">Contactos</h1>
        <p className="text-[11px] text-zinc-500">Tu ID: <span className="font-mono text-emerald-400">{user?.uniqueId}</span></p>
      </header>
      <div className="flex-1 overflow-y-auto">
        {friends.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500"><Users className="w-8 h-8 mx-auto mb-2 opacity-50" />No tienes contactos.</div>
        ) : (
          <ul>
            {friends.map((f) => (
              <li key={f.uniqueId} className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/40 hover:bg-zinc-900">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">{f.firstName.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-100 truncate">{f.displayName || f.username}</p>
                  <p className="text-xs text-zinc-400 truncate">{f.firstName} {f.lastName}</p>
                  <p className="text-[11px] text-emerald-400 font-mono">#{f.uniqueId}</p>
                </div>
                <button onClick={() => onOpenChat(f.uniqueId)} className="p-2 text-zinc-400 hover:text-emerald-400"><MessageCircle className="w-5 h-5" /></button>
                <button onClick={() => remove(f.uniqueId)} className="p-2 text-zinc-400 hover:text-red-400"><Trash2 className="w-5 h-5" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
