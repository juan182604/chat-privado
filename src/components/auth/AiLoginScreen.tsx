'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Send, X, Eye, EyeOff, Phone } from 'lucide-react'
import { useAppStore } from '@/lib/store'

type AiMsg = {
  id: string
  role: 'ai' | 'user'
  text: string
  /** What happens when the user holds this AI message for 5 seconds. */
  action?: 'auth' | 'download'
}

const AI_REPLY_ENTRAR = 'esta ia no esta en servicio en este momento'
const AI_REPLY_DESCARGA = 'no te puedo ayudar en estos momentos'

export function AiLoginScreen() {
  // Chat starts EMPTY every time the user lands on this screen.
  const [messages, setMessages] = useState<AiMsg[]>([])
  const [input, setInput] = useState('')
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [downloadPrompt, setDownloadPrompt] = useState<null | 'android' | 'ios'>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen)

  // Keep a ref to the latest startHold/cancelHold so the native event listeners
  // always call the current version. This is needed for iOS Safari which requires
  // native addEventListener with { passive: false } to make preventDefault work.
  const startHoldRef = useRef<(m: AiMsg) => void>(() => {})
  const cancelHoldRef = useRef<() => void>(() => {})

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current)
    }
  }, [])

  const send = () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    // Add the user's message to the chat
    setMessages((m) => [...m, { id: Math.random().toString(36), role: 'user', text }])

    const lower = text.toLowerCase()
    if (lower === 'entrar') {
      setTimeout(() => {
        setMessages((m) => [
          ...m,
          { id: Math.random().toString(36), role: 'ai', text: AI_REPLY_ENTRAR, action: 'auth' },
        ])
      }, 500)
    } else if (lower === 'descarga' || lower === 'descargar' || lower === 'apk' || lower === 'descarga apk' || lower === 'descarga para iphone' || lower === 'descarga para ios') {
      setTimeout(() => {
        setMessages((m) => [
          ...m,
          { id: Math.random().toString(36), role: 'ai', text: AI_REPLY_DESCARGA, action: 'download' },
        ])
      }, 500)
    }
    // Any other input: no AI response at all
  }

  const startHold = (msg: AiMsg) => {
    if (msg.action !== 'auth' && msg.action !== 'download') return
    // Clear any existing timer
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
    // Start the 5-second timer. No visual feedback — nothing shows.
    holdTimer.current = setTimeout(() => {
      if (msg.action === 'auth') {
        // Use LOCAL state (same mechanism as downloadPrompt which works on iPhone)
        // Plus also set the Zustand store as backup
        setShowAuthModal(true)
        setAuthModalOpen(true)
      } else if (msg.action === 'download') {
        // Detect platform to decide which modal to show.
        const ua = navigator.userAgent.toLowerCase()
        const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        if (isIOS) {
          setDownloadPrompt('ios')
        } else {
          setDownloadPrompt('android')
        }
      }
    }, 5000)
  }

  const cancelHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  // Keep refs updated with latest functions
  startHoldRef.current = startHold
  cancelHoldRef.current = cancelHold

  return (
    <div className="h-full bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/60 backdrop-blur ">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Asistente IA</p>
            <p className="text-[11px] text-emerald-400">● en línea</p>
          </div>
        </div>
      </header>

      {/* Chat scroll area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
          {messages.map((m) => (
            <HoldableBubble key={m.id} msg={m} startHoldRef={startHoldRef} cancelHoldRef={cancelHoldRef} />
          ))}
        </div>
      </main>

      {/* Composer */}
      <footer className="border-t border-zinc-800/60 bg-zinc-950/80 backdrop-blur ">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Escribe a la IA…"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-full px-4 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <button
            onClick={send}
            className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center transition-colors"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </footer>

      {/* Download feedback modal (Android confirms download started; iOS shows instructions) */}
      {downloadPrompt && (
        <DownloadModal
          platform={downloadPrompt}
          onClose={() => setDownloadPrompt(null)}
        />
      )}

      {/* Auth modal — rendered locally so it works on iPhone (same mechanism as downloadPrompt) */}
      {showAuthModal && (
        <AuthModalInline onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  )
}

/**
 * HoldableBubble — message bubble that supports hold-for-5-seconds on iPhone.
 *
 * iOS Safari requires native addEventListener with { passive: false } to make
 * preventDefault work on touch events. React's onTouchStart is passive by default
 * in iOS, so we use native event listeners here.
 *
 * Visual appearance is identical to the original — no buttons, no progress bar,
 * no instructions text.
 */
function HoldableBubble({
  msg,
  startHoldRef,
  cancelHoldRef,
}: {
  msg: AiMsg
  startHoldRef: React.MutableRefObject<(m: AiMsg) => void>
  cancelHoldRef: React.MutableRefObject<() => void>
}) {
  const bubbleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = bubbleRef.current
    if (!el) return
    // Only AI messages with an action are holdable
    if (msg.role !== 'ai' || !msg.action) return

    let touchActive = false

    const handleTouchStart = (e: TouchEvent) => {
      // preventDefault stops the iOS context menu, scroll, and 300ms delay.
      // MUST be passive: false to work on iOS Safari.
      e.preventDefault()
      touchActive = true
      startHoldRef.current(msg)
    }
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      touchActive = false
      cancelHoldRef.current()
    }
    const handleTouchCancel = () => {
      touchActive = false
      cancelHoldRef.current()
    }
    const handleTouchMove = () => {
      // If finger moves, cancel the hold (iOS sometimes fires touchmove)
      if (touchActive) {
        cancelHoldRef.current()
      }
    }
    const handleMouseDown = () => {
      startHoldRef.current(msg)
    }
    const handleMouseUp = () => {
      cancelHoldRef.current()
    }
    const handleMouseLeave = () => {
      cancelHoldRef.current()
    }
    const handleContextMenu = (e: Event) => {
      // Block iOS long-press context menu (callout)
      e.preventDefault()
    }

    // touchstart/touchend MUST be non-passive to call preventDefault on iOS
    el.addEventListener('touchstart', handleTouchStart, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: false })
    el.addEventListener('touchcancel', handleTouchCancel, { passive: false })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('mousedown', handleMouseDown)
    el.addEventListener('mouseup', handleMouseUp)
    el.addEventListener('mouseleave', handleMouseLeave)
    el.addEventListener('contextmenu', handleContextMenu)

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchend', handleTouchEnd)
      el.removeEventListener('touchcancel', handleTouchCancel)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('mousedown', handleMouseDown)
      el.removeEventListener('mouseup', handleMouseUp)
      el.removeEventListener('mouseleave', handleMouseLeave)
      el.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [msg, startHoldRef, cancelHoldRef])

  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        ref={bubbleRef}
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed select-none ${
          msg.role === 'user'
            ? 'bg-emerald-600 text-white rounded-br-sm'
            : 'bg-zinc-800 text-zinc-100 rounded-bl-sm border border-zinc-700/50'
        }`}
        style={{
          cursor: msg.role === 'ai' && msg.action ? 'pointer' : 'default',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          touchAction: 'manipulation',
        }}
      >
        {msg.role === 'ai' && (
          <div className="flex items-center gap-2 mb-1 opacity-70">
            <Bot className="w-3 h-3" />
            <span className="text-[10px] uppercase tracking-wide">IA</span>
          </div>
        )}
        <p>{msg.text}</p>
      </div>
    </div>
  )
}

function DownloadModal({ platform, onClose }: { platform: 'android' | 'ios'; onClose: () => void }) {
  if (platform === 'android') {
    return (
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm p-5 text-center"
        >
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
            <Bot className="w-7 h-7 text-emerald-400" />
          </div>
          <h3 className="font-bold text-zinc-100 mb-1">Descargar app</h3>
          <p className="text-sm text-zinc-400 mb-4">
            Toca el botón para descargar el APK de Chat Privado (2.4 MB):
          </p>
          <a
            href="/downloads/chat-privado.apk"
            download="chat-privado.apk"
            className="block w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-semibold text-sm mb-2"
          >
            Descargar APK
          </a>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Una vez descargado, abre el archivo para instalar. Es posible que Android pida
            permitir &quot;instalar aplicaciones de fuentes desconocidas&quot;.
          </p>
          <button
            onClick={onClose}
            className="mt-3 w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300"
          >
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  // iOS instructions
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm p-5"
      >
        <div className="w-14 h-14 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-3">
          <Bot className="w-7 h-7 text-cyan-400" />
        </div>
        <h3 className="font-bold text-zinc-100 mb-3 text-center">Instalar en iPhone/iPad</h3>
        <ol className="space-y-3 text-sm text-zinc-300">
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">1</span>
            <span>
              Toca el botón <strong className="text-white">Compartir</strong>
              <span className="inline-block mx-1 px-1.5 py-0.5 bg-zinc-800 rounded text-xs">⎋</span>
              en la barra inferior de Safari.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">2</span>
            <span>
              Selecciona <strong className="text-white">Añadir a la pantalla de inicio</strong> en el menú.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">3</span>
            <span>
              Toca <strong className="text-white">Añadir</strong> en la esquina superior derecha.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">4</span>
            <span>
              La app aparecerá en tu pantalla de inicio con el icono de Chat Privado.
            </span>
          </li>
        </ol>
        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm"
        >
          Entendido
        </button>
      </div>
    </div>
  )
}

/**
 * AuthModalInline — Login/Register modal rendered directly inside AiLoginScreen.
 * Uses LOCAL state only (no Zustand, no CustomEvent) so it works reliably on iPhone.
 * This is the exact same modal as AuthModal but self-contained.
 */
function AuthModalInline({ onClose }: { onClose: () => void }) {
  const setUser = useAppStore((s) => s.setUser)
  const setView = useAppStore((s) => s.setView)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [stayOpen, setStayOpen] = useState(true)
  const [loginUser, setLoginUser] = useState('')
  const [loginPin, setLoginPin] = useState('')
  const [rUser, setRUser] = useState('')
  const [rFirst, setRFirst] = useState('')
  const [rLast, setRLast] = useState('')
  const [rPin, setRPin] = useState('')
  const [rPin2, setRPin2] = useState('')

  const submitLogin = async () => {
    setError(null)
    const username = loginUser.trim().toLowerCase()
    const pin = loginPin.trim()
    if (!username || pin.length !== 6) { setError('Usuario y PIN de 6 dígitos requeridos'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, pin, persistent: stayOpen }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error'); setLoading(false); return }
      setUser(data.user)
      setView({ kind: 'app' })
      onClose()
      // Wait a moment for the cookie to be set, then reload
      setTimeout(() => window.location.reload(), 300)
    } catch { setError('Error de conexión'); setLoading(false) }
  }

  const submitRegister = async () => {
    setError(null)
    if (rPin !== rPin2) { setError('Los PIN no coinciden'); return }
    if (!rUser || !rFirst || !rLast || rPin.length !== 6) { setError('Todos los campos son requeridos'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: rUser.trim().toLowerCase(), firstName: rFirst.trim(), lastName: rLast.trim(), pin: rPin, persistent: stayOpen }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error'); setLoading(false); return }
      setUser(data.user)
      setView({ kind: 'app' })
      onClose()
      // Wait a moment for the cookie to be set, then reload
      setTimeout(() => window.location.reload(), 300)
    } catch { setError('Error de conexión'); setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <h2 className="font-semibold text-zinc-100">{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 py-5 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-300">{error}</div>}
          {mode === 'login' ? (
            <>
              <label className="block"><span className="block text-[11px] uppercase text-zinc-500 mb-1">Usuario</span>
                <input value={loginUser} onChange={(e) => setLoginUser(e.target.value.toLowerCase())} placeholder="tu_usuario" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-white" /></label>
              <label className="block"><span className="block text-[11px] uppercase text-zinc-500 mb-1">PIN (6 dígitos)</span>
                <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
                  <input type={showPin ? 'text' : 'password'} inputMode="numeric" maxLength={6} value={loginPin} onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="bg-transparent flex-1 outline-none text-sm tracking-widest text-white" />
                  <button type="button" onClick={() => setShowPin(v => !v)} className="text-zinc-400">{showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div></label>
              <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={stayOpen} onChange={e => setStayOpen(e.target.checked)} className="accent-emerald-500" />Mantener sesión abierta</label>
              <button onClick={submitLogin} disabled={loading || !loginUser || loginPin.length !== 6} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white py-2.5 rounded-lg font-semibold text-sm">{loading ? 'Entrando…' : 'Entrar'}</button>
              <p className="text-center text-sm text-zinc-400">¿No tienes cuenta? <button onClick={() => { setMode('register'); setError(null) }} className="text-emerald-400 hover:underline">Regístrate</button></p>
            </>
          ) : (
            <>
              <label className="block"><span className="block text-[11px] uppercase text-zinc-500 mb-1">Usuario</span>
                <input value={rUser} onChange={(e) => setRUser(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="3-20: minúsculas, números, _" maxLength={20} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-white" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="block text-[11px] uppercase text-zinc-500 mb-1">Nombre</span><input value={rFirst} onChange={(e) => setRFirst(e.target.value)} maxLength={40} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-white" /></label>
                <label className="block"><span className="block text-[11px] uppercase text-zinc-500 mb-1">Apellido</span><input value={rLast} onChange={(e) => setRLast(e.target.value)} maxLength={40} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-white" /></label>
              </div>
              <label className="block"><span className="block text-[11px] uppercase text-zinc-500 mb-1">PIN (6 dígitos)</span><input type={showPin ? 'text' : 'password'} inputMode="numeric" maxLength={6} value={rPin} onChange={(e) => setRPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-white tracking-widest" /></label>
              <label className="block"><span className="block text-[11px] uppercase text-zinc-500 mb-1">Confirmar PIN</span><input type={showPin ? 'text' : 'password'} inputMode="numeric" maxLength={6} value={rPin2} onChange={(e) => setRPin2(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-white tracking-widest" /></label>
              <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={stayOpen} onChange={e => setStayOpen(e.target.checked)} className="accent-emerald-500" />Mantener sesión abierta</label>
              <button onClick={submitRegister} disabled={loading || !rUser || !rFirst || !rLast || rPin.length !== 6 || rPin !== rPin2} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white py-2.5 rounded-lg font-semibold text-sm">{loading ? 'Creando…' : 'Crear cuenta'}</button>
              <p className="text-center text-sm text-zinc-400">¿Ya tienes cuenta? <button onClick={() => { setMode('login'); setError(null) }} className="text-emerald-400 hover:underline">Inicia sesión</button></p>
            </>
          )}
        </div>
        <div className="border-t border-zinc-800 px-5 py-3 text-center text-[11px] text-zinc-500"><Phone className="inline w-3 h-3 mr-1" />Android, iOS y web — mismo ID, misma cuenta.</div>
      </div>
    </div>
  )
}
