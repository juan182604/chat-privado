'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { VoicePlayer } from '@/components/chat/VoicePlayer'
import { Lightbox } from '@/components/chat/Lightbox'
import { Shield, ShieldAlert, Trash2, Lock, Unlock, Eye, Search, Crown, UserCheck, UserX, ScrollText, ArrowLeft, MessageCircle, X, Calendar, Hash, AtSign, User as UserIcon } from 'lucide-react'

type AdminUser = {
  id: string
  uniqueId: string
  username: string
  firstName: string
  lastName: string
  role: string
  blocked: boolean
  blockReason: string | null
  blockedAt: string | null
  createdAt: string
}

type LogEntry = {
  id: string
  action: string
  reason: string | null
  createdAt: string
  actor: { username: string; uniqueId: string } | null
  targetUserId: string | null
}

type ConversationPeer = {
  peer: {
    uniqueId: string
    username: string
    firstName: string
    lastName: string
    blocked: boolean
  }
  messages: Array<{
    id: string
    type: string
    content: string | null
    mediaPath: string | null
    callKind: string | null
    callDuration: number | null
    callStatus: string | null
    sentAt: string
    readAt: string | null
    fromUser: boolean
    photoExpiresSeconds: number | null
    photoViewStartedAt: string | null
    photoExpired: boolean
  }>
}

export function AdminPanel() {
  const user = useAppStore((s) => s.user)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'blocked' | 'admin'>('all')
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'users' | 'audit' | 'conversation'>('users')

  // Conversations tab state
  const [convSearch, setConvSearch] = useState('') // search by username OR id
  const [convUsers, setConvUsers] = useState<AdminUser[]>([]) // all users shown in the left list
  const [convUsersLoading, setConvUsersLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUserConvs, setSelectedUserConvs] = useState<{ user: any; conversations: ConversationPeer[] } | null>(null)
  const [convLoading, setConvLoading] = useState(false)
  const [openPeer, setOpenPeer] = useState<string | null>(null) // which peer's messages are expanded

  const [actionTarget, setActionTarget] = useState<AdminUser | null>(null)
  const [reason, setReason] = useState('')

  // Users tab: detail drawer for the selected user (shows full name + profile)
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null)

  const isSuper = user?.role === 'super_admin'

  // Polling: refresh users every 2 seconds so new registrations appear instantly.
  // The fetch includes cache:'no-store' to bypass any browser/CDN cache,
  // so users registered from any other browser/IP/device show up here immediately.
  useEffect(() => {
    if (view !== 'users') return
    let cancelled = false
    let inFlight = false

    const run = async () => {
      if (inFlight) return
      inFlight = true
      try {
        let url = '/api/admin/poll?_t=' + Date.now() + '&'
        if (q) url += `q=${encodeURIComponent(q)}&`
        if (filter === 'blocked') url += 'blocked=1&'
        if (filter === 'admin') url += 'role=admin&'
        const res = await fetch(url, { cache: 'no-store' as RequestCache })
        const data = await res.json()
        if (!cancelled && Array.isArray(data.users)) {
          setUsers(data.users)
        }
      } finally {
        inFlight = false
        if (cancelled) return
        setLoading(false)
      }
    }

    run()
    const t = setInterval(run, 2000)
    return () => { cancelled = true; clearInterval(t) }
  }, [q, filter, view])

  // Conversations tab: load list of all users (for the left-side picker).
  // Polls every 5 seconds so new users appear automatically.
  useEffect(() => {
    if (view !== 'conversation') return
    let cancelled = false
    let inFlight = false
    const run = async () => {
      if (inFlight) return
      inFlight = true
      try {
        const res = await fetch(`/api/admin/poll?_t=${Date.now()}`, {
          cache: 'no-store' as RequestCache,
        })
        const data = await res.json()
        if (!cancelled && Array.isArray(data.users)) {
          setConvUsers(data.users)
        }
      } finally {
        inFlight = false
        if (!cancelled) setConvUsersLoading(false)
      }
    }
    run()
    const t = setInterval(run, 5000)
    return () => { cancelled = true; clearInterval(t) }
  }, [view])

  // When a user is selected, fetch all their active conversations
  const selectUser = async (u: AdminUser) => {
    setSelectedUserId(u.uniqueId)
    setSelectedUserConvs(null)
    setOpenPeer(null)
    setConvLoading(true)
    try {
      const res = await fetch(
        `/api/admin/user-conversations?_t=${Date.now()}&uniqueId=${u.uniqueId}`,
        { cache: 'no-store' as RequestCache },
      )
      const data = await res.json()
      if (res.ok) {
        setSelectedUserConvs(data)
      } else {
        alert(data.error || 'Error al cargar conversaciones')
      }
    } finally {
      setConvLoading(false)
    }
  }

  // Audit logs: refresh every 5 seconds when on that tab
  useEffect(() => {
    if (view !== 'audit') return
    let cancelled = false
    const run = async () => {
      const res = await fetch('/api/admin/audit')
      const data = await res.json()
      if (!cancelled && Array.isArray(data.logs)) setLogs(data.logs)
    }
    run()
    const t = setInterval(run, 5000)
    return () => { cancelled = true; clearInterval(t) }
  }, [view])

  const runAction = async (target: AdminUser, action: string, reasonText?: string) => {
    const res = await fetch('/api/admin/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId: target.id, action, reason: reasonText ?? null }),
    })
    const data = await res.json()
    if (!res.ok) {
      alert(data.error || 'Error')
      return
    }
    setActionTarget(null)
    setReason('')
    // Force an immediate refresh
    setLoading(true)
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <header className="px-4 py-3 border-b border-zinc-800/60 sticky top-0 bg-zinc-950 z-10">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-amber-400" />
          <h1 className="text-xl font-bold text-zinc-100">Panel de Administración</h1>
        </div>
        <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
          <button
            onClick={() => setView('users')}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium ${view === 'users' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
          >
            Usuarios
          </button>
          <button
            onClick={() => setView('conversation')}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium ${view === 'conversation' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
          >
            Conversaciones
          </button>
          <button
            onClick={() => setView('audit')}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium ${view === 'audit' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
          >
            Auditoría
          </button>
        </div>
        {!isSuper && (
          <p className="text-[11px] text-amber-400 mt-2">
            Eres admin. Solo el super admin puede gestionar roles o eliminar otros admins.
          </p>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        {view === 'users' && (
          <div>
            <div className="px-4 py-3 flex gap-2 border-b border-zinc-800/60">
              <div className="flex-1 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-zinc-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por usuario, ID, nombre…"
                  className="bg-transparent flex-1 outline-none text-sm text-zinc-100"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-100"
              >
                <option value="all">Todos</option>
                <option value="blocked">Bloqueados</option>
                <option value="admin">Admins</option>
              </select>
            </div>

            {loading && users.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">Cargando…</div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">Sin usuarios.</div>
            ) : (
              <ul>
                {users.map((u) => (
                  <li
                    key={u.id}
                    onClick={() => setDetailUser(u)}
                    className="px-4 py-3 border-b border-zinc-800/40 hover:bg-zinc-900 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold ${u.blocked ? 'bg-red-500/30' : 'bg-gradient-to-br from-emerald-500 to-cyan-500'}`}>
                        {u.firstName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-zinc-100 truncate">{u.username}</p>
                          <span className="text-[10px] font-mono text-emerald-400">#{u.uniqueId}</span>
                          {u.role === 'super_admin' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 rounded-full text-[10px] text-amber-300">
                              <Crown className="w-3 h-3" /> Super
                            </span>
                          )}
                          {u.role === 'admin' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/15 border border-cyan-500/30 rounded-full text-[10px] text-cyan-300">
                              <Shield className="w-3 h-3" /> Admin
                            </span>
                          )}
                          {u.blocked && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/15 border border-red-500/30 rounded-full text-[10px] text-red-300">
                              <Lock className="w-3 h-3" /> Bloqueado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 truncate">{u.firstName} {u.lastName}</p>
                        {u.blocked && u.blockReason && (
                          <p className="text-[11px] text-red-400 truncate">Motivo: {u.blockReason}</p>
                        )}
                      </div>
                    </div>
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex gap-1 mt-2 justify-end"
                    >
                      {u.role !== 'super_admin' && (
                        <>
                          {u.blocked ? (
                            <button
                              onClick={() => runAction(u, 'unblock')}
                              className="px-2 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-400 flex items-center gap-1"
                            >
                              <Unlock className="w-3 h-3" /> Desbloquear
                            </button>
                          ) : (
                            <button
                              onClick={() => { setActionTarget(u); setReason(''); }}
                              className="px-2 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-amber-400 flex items-center gap-1"
                            >
                              <Lock className="w-3 h-3" /> Bloquear
                            </button>
                          )}
                          {isSuper && u.role !== 'admin' && (
                            <button
                              onClick={() => runAction(u, 'promote_admin')}
                              className="px-2 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-400 flex items-center gap-1"
                            >
                              <UserCheck className="w-3 h-3" /> Hacer admin
                            </button>
                          )}
                          {isSuper && u.role === 'admin' && (
                            <button
                              onClick={() => runAction(u, 'demote_admin')}
                              className="px-2 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-orange-400 flex items-center gap-1"
                            >
                              <UserX className="w-3 h-3" /> Quitar admin
                            </button>
                          )}
                          <button
                            onClick={() => { if (confirm(`¿Eliminar a ${u.username}? Se borrarán sus mensajes y contactos.`)) runAction(u, 'delete') }}
                            className="px-2 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-red-400 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {view === 'conversation' && (
          <div className="flex flex-col md:flex-row h-full">
            {/* LEFT: list of all users (searchable by username OR id) */}
            <div className="md:w-72 md:border-r border-zinc-800/60 flex flex-col">
              <div className="p-3 border-b border-zinc-800/60 sticky top-0 bg-zinc-950 z-10">
                <p className="text-sm font-semibold text-zinc-200 mb-2">Selecciona un usuario</p>
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                  <Search className="w-4 h-4 text-zinc-500" />
                  <input
                    value={convSearch}
                    onChange={(e) => setConvSearch(e.target.value.toLowerCase())}
                    placeholder="Nombre de usuario o ID…"
                    className="bg-transparent flex-1 outline-none text-sm text-zinc-100"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {convUsersLoading && convUsers.length === 0 ? (
                  <div className="p-4 text-center text-zinc-500 text-sm">Cargando usuarios…</div>
                ) : (
                  <ul>
                    {convUsers
                      .filter((u) => {
                        if (!convSearch) return true
                        return (
                          u.username.toLowerCase().includes(convSearch) ||
                          u.uniqueId.toLowerCase().includes(convSearch) ||
                          u.firstName.toLowerCase().includes(convSearch) ||
                          u.lastName.toLowerCase().includes(convSearch)
                        )
                      })
                      .map((u) => (
                        <li
                          key={u.id}
                          onClick={() => selectUser(u)}
                          className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-zinc-800/40 hover:bg-zinc-900 ${
                            selectedUserId === u.uniqueId ? 'bg-zinc-800/70' : ''
                          }`}
                        >
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {u.firstName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-100 truncate">{u.username}</p>
                            <p className="text-[11px] text-zinc-500 font-mono">#{u.uniqueId}</p>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>

            {/* RIGHT: conversations of selected user */}
            <div className="flex-1 overflow-y-auto">
              {!selectedUserId ? (
                <div className="p-8 text-center text-zinc-500 text-sm">
                  <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  Selecciona un usuario de la izquierda para ver todas sus conversaciones activas.
                </div>
              ) : convLoading ? (
                <div className="p-8 text-center text-zinc-500 text-sm">Cargando conversaciones…</div>
              ) : !selectedUserConvs ? (
                <div className="p-8 text-center text-zinc-500 text-sm">Sin datos.</div>
              ) : (
                <div className="p-4 space-y-4">
                  {/* Back button on mobile */}
                  <button
                    onClick={() => setSelectedUserId(null)}
                    className="md:hidden flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100"
                  >
                    <ArrowLeft className="w-4 h-4" /> Volver a la lista
                  </button>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                        {selectedUserConvs.user.firstName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-zinc-100">{selectedUserConvs.user.username}</p>
                        <p className="text-xs text-zinc-400">
                          {selectedUserConvs.user.firstName} {selectedUserConvs.user.lastName} · #{selectedUserConvs.user.uniqueId}
                        </p>
                        <p className="text-xs text-emerald-400 mt-1">
                          {selectedUserConvs.conversations.length} conversación{selectedUserConvs.conversations.length === 1 ? '' : 'es'} activa{selectedUserConvs.conversations.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-3 leading-relaxed">
                      Solo se muestran mensajes dentro de la ventana de 10 horas. Una vez expiran,
                      se borran permanentemente de la nube y no se pueden recuperar.
                    </p>
                  </div>

                  {selectedUserConvs.conversations.length === 0 ? (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
                      Este usuario no tiene conversaciones activas en este momento.
                    </div>
                  ) : (
                    selectedUserConvs.conversations.map((conv) => {
                      const lastMsg = conv.messages[conv.messages.length - 1]
                      const lastTime = lastMsg ? new Date(lastMsg.sentAt).toLocaleString() : ''
                      return (
                        <div key={conv.peer.uniqueId} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                          <button
                            onClick={() => setOpenPeer(openPeer === conv.peer.uniqueId ? null : conv.peer.uniqueId)}
                            className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800/50 transition-colors text-left"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
                              {conv.peer.firstName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-zinc-100 truncate">
                                {conv.peer.username}
                                <span className="ml-2 text-[10px] font-mono text-cyan-400">#{conv.peer.uniqueId}</span>
                              </p>
                              <p className="text-xs text-zinc-400 truncate">
                                {conv.peer.firstName} {conv.peer.lastName}
                                {conv.peer.blocked && <span className="ml-2 text-red-400">· bloqueado</span>}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="bg-emerald-500/15 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full">
                                {conv.messages.length} mensaje{conv.messages.length === 1 ? '' : 's'}
                              </span>
                              <p className="text-[10px] text-zinc-500 mt-1">{lastTime}</p>
                            </div>
                            <Eye className={`w-4 h-4 text-zinc-500 ml-2 transition-transform ${openPeer === conv.peer.uniqueId ? 'rotate-180' : ''}`} />
                          </button>

                          {openPeer === conv.peer.uniqueId && (
                            <div className="border-t border-zinc-800 p-3 space-y-2 max-h-96 overflow-y-auto bg-zinc-950/40">
                              <button
                                onClick={async () => {
                                  if (!confirm(`¿Borrar TODA la conversación entre ${selectedUserConvs.user.username} y ${conv.peer.username}? Se eliminarán ${conv.messages.length} mensajes y sus archivos. No se puede deshacer.`)) return
                                  try {
                                    const res = await fetch('/api/admin/delete-conversation', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        userUniqueId: selectedUserConvs.user.uniqueId,
                                        peerUniqueId: conv.peer.uniqueId,
                                      }),
                                    })
                                    const data = await res.json()
                                    if (res.ok) {
                                      alert(`Conversación borrada: ${data.deletedCount} mensajes eliminados`)
                                      // Refresh the conversations
                                      selectUser({ uniqueId: selectedUserConvs.user.uniqueId, id: '', username: '', firstName: '', lastName: '', role: '', blocked: false, blockReason: null, blockedAt: null, createdAt: '' } as AdminUser)
                                    } else {
                                      alert(data.error || 'Error')
                                    }
                                  } catch (e) {
                                    alert('Error de conexión')
                                  }
                                }}
                                className="w-full mb-2 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 text-red-300 text-xs font-semibold flex items-center justify-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> Borrar conversación completa ({conv.messages.length} mensajes)
                              </button>
                              {conv.messages.map((m) => (
                                <AdminMessageBubble
                                  key={m.id}
                                  message={m}
                                  fromUsername={selectedUserConvs.user.username}
                                  peerUsername={conv.peer.username}
                                  userUniqueId={selectedUserConvs.user.uniqueId}
                                  peerUniqueId={conv.peer.uniqueId}
                                  onDeleted={() => {
                                    // Refresh conversations
                                    selectUser({ uniqueId: selectedUserConvs.user.uniqueId, id: '', username: '', firstName: '', lastName: '', role: '', blocked: false, blockReason: null, blockedAt: null, createdAt: '' } as AdminUser)
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'audit' && (
          <div className="p-4">
            {logs.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">Sin eventos registrados.</p>
            ) : (
              <ul className="space-y-2">
                {logs.map((l) => (
                  <li key={l.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <ScrollText className="w-3 h-3 text-zinc-500" />
                      <span className="font-mono text-xs text-emerald-400">{l.action}</span>
                      <span className="text-[11px] text-zinc-500 ml-auto">
                        {new Date(l.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {l.reason && <p className="text-xs text-zinc-400 mt-1">{l.reason}</p>}
                    {l.actor && (
                      <p className="text-[11px] text-zinc-500 mt-1">
                        por @{l.actor.username} (#{l.actor.uniqueId})
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* User detail drawer — shown when admin clicks a user in the list */}
      {detailUser && (
        <div
          onClick={() => setDetailUser(null)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-zinc-700 rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3 sticky top-0 bg-zinc-900 z-10">
              <h2 className="font-semibold text-zinc-100">Detalle del usuario</h2>
              <button
                onClick={() => setDetailUser(null)}
                className="text-zinc-400 hover:text-zinc-100"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Avatar + nombre completo destacado */}
              <div className="text-center">
                <div className={`w-24 h-24 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold text-4xl ${detailUser.blocked ? 'bg-red-500/30' : 'bg-gradient-to-br from-emerald-500 to-cyan-500'}`}>
                  {detailUser.firstName.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-xl font-bold text-zinc-100">
                  {detailUser.firstName} {detailUser.lastName}
                </h3>
                <p className="text-sm text-zinc-400">@{detailUser.username}</p>

                <div className="flex items-center justify-center gap-2 flex-wrap mt-3">
                  {detailUser.role === 'super_admin' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-xs text-amber-300">
                      <Crown className="w-3 h-3" /> Super Admin
                    </span>
                  )}
                  {detailUser.role === 'admin' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-500/15 border border-cyan-500/30 rounded-full text-xs text-cyan-300">
                      <Shield className="w-3 h-3" /> Admin
                    </span>
                  )}
                  {detailUser.role === 'user' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-700/40 border border-zinc-600/40 rounded-full text-xs text-zinc-300">
                      <UserIcon className="w-3 h-3" /> Usuario
                    </span>
                  )}
                  {detailUser.blocked && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/15 border border-red-500/30 rounded-full text-xs text-red-300">
                      <Lock className="w-3 h-3" /> Bloqueado
                    </span>
                  )}
                </div>
              </div>

              {/* Datos personales */}
              <div className="bg-zinc-800/40 border border-zinc-700/60 rounded-xl divide-y divide-zinc-700/60">
                <DetailRow icon={<UserIcon className="w-4 h-4" />} label="Nombre" value={detailUser.firstName} />
                <DetailRow icon={<UserIcon className="w-4 h-4" />} label="Apellido" value={detailUser.lastName} />
                <DetailRow icon={<AtSign className="w-4 h-4" />} label="Usuario" value={detailUser.username} />
                <DetailRow icon={<Hash className="w-4 h-4" />} label="ID único" value={detailUser.uniqueId} mono />
                <DetailRow icon={<Calendar className="w-4 h-4" />} label="Registrado" value={new Date(detailUser.createdAt).toLocaleString()} />
              </div>

              {/* Estado de bloqueo */}
              {detailUser.blocked && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <p className="text-xs font-semibold text-red-300 mb-1 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Cuenta bloqueada
                  </p>
                  {detailUser.blockReason ? (
                    <p className="text-sm text-red-200">{detailUser.blockReason}</p>
                  ) : (
                    <p className="text-sm text-red-200/70 italic">Sin motivo especificado</p>
                  )}
                  {detailUser.blockedAt && (
                    <p className="text-[11px] text-red-300/70 mt-1">
                      Desde {new Date(detailUser.blockedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Acciones rápidas en el pie del detalle */}
            {detailUser.role !== 'super_admin' && (
              <div className="border-t border-zinc-800 px-5 py-3 flex gap-2 flex-wrap sticky bottom-0 bg-zinc-900">
                {detailUser.blocked ? (
                  <button
                    onClick={() => { runAction(detailUser, 'unblock'); setDetailUser(null) }}
                    className="flex-1 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/40 text-emerald-300 text-sm flex items-center justify-center gap-1"
                  >
                    <Unlock className="w-4 h-4" /> Desbloquear
                  </button>
                ) : (
                  <button
                    onClick={() => { setActionTarget(detailUser); setReason(''); setDetailUser(null) }}
                    className="flex-1 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/40 text-amber-300 text-sm flex items-center justify-center gap-1"
                  >
                    <Lock className="w-4 h-4" /> Bloquear
                  </button>
                )}
                <button
                  onClick={() => { if (confirm(`¿Eliminar a ${detailUser.username}? Se borrarán sus mensajes y contactos.`)) { runAction(detailUser, 'delete'); setDetailUser(null) } }}
                  className="flex-1 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 text-red-300 text-sm flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Block reason modal */}
      {actionTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-zinc-100">Bloquear a @{actionTarget.username}</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-3">
              La cuenta será bloqueada inmediatamente y todas sus sesiones se cerrarán.
              Se cerrará la sesión del usuario en todos sus dispositivos.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo / etiqueta del bloqueo (visible para el usuario)…"
              maxLength={500}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-zinc-100 min-h-20 resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setActionTarget(null); setReason('') }}
                className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300"
              >
                Cancelar
              </button>
              <button
                onClick={() => runAction(actionTarget, 'block', reason || undefined)}
                className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm text-white font-semibold"
              >
                Bloquear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Message bubble shown in the admin's conversation supervision view.
 * Supports click-to-zoom for photos (Lightbox) and a real audio player for
 * voice notes (VoicePlayer with progress bar + duration).
 */
function AdminMessageBubble({
  message: m,
  fromUsername,
  peerUsername,
  userUniqueId,
  peerUniqueId,
  onDeleted,
}: {
  message: {
    id: string
    type: string
    content: string | null
    mediaPath: string | null
    callKind: string | null
    callDuration: number | null
    callStatus: string | null
    sentAt: string
    readAt: string | null
    fromUser: boolean
    photoExpiresSeconds: number | null
    photoViewStartedAt: string | null
    photoExpired: boolean
  }
  fromUsername: string
  peerUsername: string
  userUniqueId: string
  peerUniqueId: string
  onDeleted: () => void
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const deleteMessage = async () => {
    if (!confirm('¿Borrar este mensaje? Se eliminará permanentemente de la base de datos y de la nube.')) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/delete-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: m.id }),
      })
      const data = await res.json()
      if (res.ok) {
        onDeleted()
      } else {
        alert(data.error || 'Error')
      }
    } catch {
      alert('Error de conexión')
    } finally {
      setDeleting(false)
    }
  }

  // Format the photo self-destruct info for the admin view
  const photoTimerLabel = (() => {
    if (m.type !== 'photo' || !m.photoExpiresSeconds) return null
    const total = m.photoExpiresSeconds
    const totalLabel =
      total < 60 ? `${total}s` :
      total < 3600 ? `${Math.floor(total / 60)}m` :
      `${Math.floor(total / 3600)}h`
    if (m.photoExpired) {
      return { text: `Foto auto-destruída (${totalLabel}) — expirada para usuarios`, color: 'text-red-400' }
    }
    if (!m.photoViewStartedAt) {
      return { text: `Foto auto-destruible (${totalLabel}) — pendiente de apertura`, color: 'text-amber-400' }
    }
    return { text: `Foto auto-destruible (${totalLabel}) — vista ${new Date(m.photoViewStartedAt).toLocaleString()}`, color: 'text-cyan-400' }
  })()

  return (
    <>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          m.fromUser
            ? 'bg-emerald-600/20 border border-emerald-600/30 ml-auto'
            : 'bg-cyan-600/20 border border-cyan-600/30'
        }`}
      >
        <p className="text-[10px] text-zinc-500 mb-1 flex items-center gap-2">
          <span className="font-semibold">
            {m.fromUser ? fromUsername : peerUsername}
          </span>
          <span>·</span>
          <span>{new Date(m.sentAt).toLocaleString()}</span>
          {m.readAt && <span className="text-emerald-500">· leído</span>}
        </p>
        {m.type === 'text' && <p className="text-zinc-100 break-words whitespace-pre-wrap">{m.content}</p>}
        {m.type === 'photo' && m.mediaPath && (
          <>
            <img
              src={`/api/media?path=${encodeURIComponent(m.mediaPath)}`}
              alt=""
              onClick={() => setLightboxOpen(true)}
              className={`rounded max-w-full max-h-48 cursor-zoom-in hover:opacity-90 transition-opacity ${m.photoExpired ? 'opacity-60 border border-red-500/30' : ''}`}
            />
            <p className="text-[10px] text-zinc-500 mt-1 italic">Haz clic en la imagen para ampliar</p>
            {photoTimerLabel && (
              <p className={`text-[10px] mt-1 flex items-center gap-1 ${photoTimerLabel.color}`}>
                <ShieldAlert className="w-3 h-3" />
                {photoTimerLabel.text}
              </p>
            )}
          </>
        )}
        {m.type === 'voice' && m.mediaPath && (
          <div className="py-1">
            <VoicePlayer path={m.mediaPath} mine={m.fromUser} tone="light" />
          </div>
        )}
        {m.type === 'call' && (
          <p className="text-zinc-300 italic">
            📞 Llamada {m.callKind} · {m.callStatus}
            {m.callDuration ? ` · ${Math.floor(m.callDuration / 60)}:${String(m.callDuration % 60).padStart(2, '0')}` : ''}
          </p>
        )}
        {/* Delete button — admin can delete any message immediately */}
        <div className="flex justify-end mt-2">
          <button
            onClick={deleteMessage}
            disabled={deleting}
            className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 disabled:opacity-50"
            title="Borrar este mensaje"
          >
            <Trash2 className="w-3 h-3" />
            {deleting ? 'Borrando…' : 'Borrar mensaje'}
          </button>
        </div>
      </div>
      {lightboxOpen && m.mediaPath && (
        <Lightbox
          src={`/api/media?path=${encodeURIComponent(m.mediaPath)}`}
          alt="foto administrador"
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  )
}

/**
 * A single label/value row used in the user detail drawer.
 */
function DetailRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-zinc-500 shrink-0">{icon}</span>
      <span className="text-xs text-zinc-500 uppercase tracking-wide w-20 shrink-0">{label}</span>
      <span className={`text-sm text-zinc-100 flex-1 text-right truncate ${mono ? "font-mono text-emerald-400" : ""}`}>
        {value}
      </span>
    </div>
  )
}
