'use client'

import { useAppStore } from '@/lib/store'
import { Copy, LogOut, Shield, Info, Download, Smartphone, Edit, KeyRound, User as UserIcon } from 'lucide-react'
import { useState } from 'react'

export function ProfileView() {
  const { user, setUser, setView } = useAppStore()
    const [copied, setCopied] = useState(false)
  const [showDownload, setShowDownload] = useState(false)
  const [showEditName, setShowEditName] = useState(false)
  const [showChangePin, setShowChangePin] = useState(false)

  if (!user) return null

  const copyId = () => {
    navigator.clipboard.writeText(user.uniqueId)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setView({ kind: 'ai' })
    window.location.reload()
  }

  // The name shown in chats — displayName if set, otherwise firstName + lastName
  const chatName = user.displayName || `${user.firstName} ${user.lastName}`

  return (
    <div className="flex flex-col h-full">
      <header className="px-4 py-3 border-b border-zinc-800/60 ">
        <h1 className="text-xl font-bold text-zinc-100">Perfil</h1>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold text-3xl mx-auto mb-3">
            {chatName.charAt(0).toUpperCase()}
          </div>
          <p className="text-lg font-bold text-zinc-100">{chatName}</p>
          <p className="text-sm text-zinc-400">@{user.username}</p>
          <p className="text-xs text-zinc-500 mt-1">Nombre de inicio de sesión: @{user.username} (no cambia)</p>
          {user.role !== 'user' && (
            <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-xs text-amber-300">
              <Shield className="w-3 h-3" />
              {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </span>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Tu ID único</p>
          <div className="flex items-center gap-3">
            <p className="font-mono text-2xl text-emerald-400 tracking-widest flex-1">{user.uniqueId}</p>
            <button
              onClick={copyId}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              title="Copiar"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          {copied && <p className="text-xs text-emerald-400 mt-1">¡Copiado!</p>}
          <p className="text-xs text-zinc-500 mt-2">
            Comparte este ID para que otros te agreguen. Las personas NO pueden buscarte por nombre.
          </p>
        </div>

        {/* Cambiar nombre del chat */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-semibold text-zinc-200">Nombre en el chat</p>
              <p className="text-xs text-zinc-500">El nombre que ven los demás en los chats</p>
            </div>
            <button
              onClick={() => setShowEditName(true)}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-400"
              title="Cambiar nombre"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-zinc-300 mt-2">
            Actual: <strong className="text-emerald-400">{chatName}</strong>
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Tu nombre de inicio de sesión (@{user.username}) no cambia, solo el nombre que se muestra en los chats.
          </p>
        </div>

        {/* Cambiar PIN */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-semibold text-zinc-200">Cambiar PIN</p>
              <p className="text-xs text-zinc-500">Tu PIN de 6 dígitos para iniciar sesión</p>
            </div>
            <button
              onClick={() => setShowChangePin(true)}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400"
              title="Cambiar PIN"
            >
              <KeyRound className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Necesitas tu PIN actual para cambiarlo. Tu usuario (@{user.username}) sigue siendo el mismo.
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-start gap-2 text-sm text-zinc-300">
            <Info className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold mb-1">Auto-borrado de 10 horas</p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Todos los mensajes (texto, fotos, notas de voz, llamadas) se borran automáticamente a las 10 horas
                de enviados (si no los has leído) o a las 10 horas de leerlos. Se eliminan de la nube también,
                liberando espacio. Solo se mantienen los usuarios registrados y los admins.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowDownload(true)}
          className="w-full bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Descargar app para Android / iOS
        </button>

        <button
          onClick={logout}
          className="w-full bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 text-red-400 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>

      {showDownload && <DownloadModal onClose={() => setShowDownload(false)} />}
      {showEditName && (
        <EditNameModal
          currentName={chatName}
          onClose={() => setShowEditName(false)}
          onSaved={(newName) => {
            setUser({ ...user, displayName: newName })
            setShowEditName(false)
          }}
        />
      )}
      {showChangePin && <ChangePinModal onClose={() => setShowChangePin(false)} />}
    </div>
  )
}

function EditNameModal({
  currentName,
  onClose,
  onSaved,
}: {
  currentName: string
  onClose: () => void
  onSaved: (newName: string | null) => void
}) {
  const [name, setName] = useState(currentName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/profile/display-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error')
        return
      }
      onSaved(name.trim() || null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-5">
        <h3 className="font-bold text-zinc-100 mb-3 flex items-center gap-2">
          <Edit className="w-5 h-5 text-emerald-400" /> Cambiar nombre del chat
        </h3>
        <p className="text-xs text-zinc-400 mb-3">
          Este es el nombre que verán los demás en los chats. Tu usuario de inicio de sesión no cambia.
        </p>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-300 mb-3">
            {error}
          </div>
        )}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="Tu nombre en el chat…"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-zinc-100"
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-sm text-white font-semibold"
          >
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ChangePinModal({ onClose }: { onClose: () => void }) {
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const save = async () => {
    setError(null)
    if (newPin !== confirmPin) {
      setError('Los PIN nuevos no coinciden')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/profile/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error')
        return
      }
      setSuccess(true)
      setTimeout(onClose, 1500)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl w-full max-w-md p-5 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="text-zinc-100 font-semibold">PIN cambiado correctamente</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-5">
        <h3 className="font-bold text-zinc-100 mb-3 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-amber-400" /> Cambiar PIN
        </h3>
        <p className="text-xs text-zinc-400 mb-3">
          Necesitas tu PIN actual. Tu usuario de inicio de sesión no cambia.
        </p>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-300 mb-3">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-zinc-500 mb-1">PIN actual</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-zinc-100 tracking-widest"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Nuevo PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-zinc-100 tracking-widest"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Confirmar nuevo PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-zinc-100 tracking-widest"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={loading || currentPin.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6}
            className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-sm text-white font-semibold"
          >
            {loading ? 'Cambiando…' : 'Cambiar PIN'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DownloadModal({ onClose }: { onClose: () => void }) {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : ''
  const isIOS = /iphone|ipad|ipod/.test(ua) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isAndroid = /android/.test(ua)

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-zinc-100">Descargar la app</h3>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-3">
          <p className="text-sm font-semibold text-emerald-300 mb-1">📱 Android</p>
          <p className="text-xs text-zinc-400 mb-3">Descarga el APK e instálalo.</p>
          <a
            href="/downloads/chat-privado.apk"
            download="chat-privado.apk"
            className="block w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-semibold text-sm text-center"
          >
            Descargar APK
          </a>
        </div>
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
          <p className="text-sm font-semibold text-cyan-300 mb-1">🍎 iPhone / iPad</p>
          <p className="text-xs text-zinc-400 mb-3">Agrega la web app a tu pantalla de inicio:</p>
          <ol className="space-y-2 text-xs text-zinc-300 list-decimal list-inside">
            <li>Abre esta página en <strong>Safari</strong></li>
            <li>Toca <strong>Compartir</strong> ⎋</li>
            <li>Elige <strong>Añadir a pantalla de inicio</strong></li>
            <li>Toca <strong>Añadir</strong></li>
          </ol>
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
