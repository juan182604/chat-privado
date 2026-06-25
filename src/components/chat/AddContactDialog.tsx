'use client'

import { useEffect, useState } from 'react'
import { useAppStore, Friend } from '@/lib/store'
import { X, Search, UserPlus, Check, Loader2 } from 'lucide-react'

export function AddContactDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const user = useAppStore((s) => s.user)
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<Friend | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setFound(null)
      setError(null)
    }
  }, [open])

  const search = async () => {
    setError(null)
    setFound(null)
    const id = query.trim().toLowerCase()
    if (!/^[a-z0-9]{6}$/.test(id)) {
      setError('El ID debe ser 6 caracteres (letras minúsculas + números)')
      return
    }
    setSearching(true)
    try {
      // cache:'no-store' + timestamp ensure we always search the live DB,
      // so users registered from any browser/IP/device are findable immediately.
      const res = await fetch(
        `/api/users/search?_t=${Date.now()}&id=${id}`,
        { cache: 'no-store' as RequestCache },
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'No encontrado')
        return
      }
      setFound(data.user)
    } finally {
      setSearching(false)
    }
  }

  const add = async () => {
    if (!found) return
    setAdding(true)
    try {
      const res = await fetch('/api/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUniqueId: found.uniqueId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al agregar')
        return
      }
      // The global polling loop will refresh the chats/friends lists automatically.
      onOpenChange(false)
    } finally {
      setAdding(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <h2 className="font-semibold text-zinc-100 flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Agregar contacto
          </h2>
          <button onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-zinc-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Solo puedes agregar contactos por su <strong className="text-zinc-200">ID único de 6 caracteres</strong> (no por nombre).
            Pídelo a la persona — está formado por letras minúsculas y números.
          </p>

          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value.toLowerCase())}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="ej: a3x9k2"
              maxLength={6}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono tracking-widest outline-none focus:border-emerald-500 uppercase"
            />
            <button
              onClick={search}
              disabled={searching || query.length !== 6}
              className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 px-4 rounded-lg text-sm text-white flex items-center gap-1"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          {found && (
            <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                {found.firstName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-zinc-100">{found.username}</p>
                <p className="text-xs text-zinc-400 truncate">
                  {found.firstName} {found.lastName}
                </p>
                <p className="text-[11px] text-emerald-400 font-mono">#{found.uniqueId}</p>
              </div>
              <button
                onClick={add}
                disabled={adding}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-3 py-1.5 rounded-lg text-xs text-white flex items-center gap-1"
              >
                {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Agregar
              </button>
            </div>
          )}

          <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 text-xs text-zinc-400">
            <p className="font-semibold text-zinc-300 mb-1">Tu ID para compartir:</p>
            <p className="font-mono text-lg text-emerald-400 tracking-widest">{user?.uniqueId}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
