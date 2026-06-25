'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Send } from 'lucide-react'

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
    // Start the 5-second timer. No visual feedback — nothing shows.
    holdTimer.current = setTimeout(() => {
      if (msg.action === 'auth') {
        window.dispatchEvent(new CustomEvent('nx:show-auth'))
      } else if (msg.action === 'download') {
        // Detect platform to decide which modal to show.
        // The APK is NOT downloaded automatically — the user must click the
        // "Descargar APK" button inside the modal.
        const ua = navigator.userAgent.toLowerCase()
        const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        if (isIOS) {
          setDownloadPrompt('ios')
        } else {
          // Android (or desktop): show the modal with a manual download button
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/60 backdrop-blur sticky top-0 z-10 bg-zinc-950/80">
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
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed select-none ${
                  m.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-sm'
                    : 'bg-zinc-800 text-zinc-100 rounded-bl-sm border border-zinc-700/50'
                }`}
                onMouseDown={() => m.role === 'ai' && startHold(m)}
                onMouseUp={cancelHold}
                onMouseLeave={cancelHold}
                onTouchStart={(e) => {
                  if (m.role === 'ai') {
                    e.preventDefault()
                    startHold(m)
                  }
                }}
                onTouchEnd={cancelHold}
                onTouchCancel={cancelHold}
                style={{ cursor: m.role === 'ai' && m.action ? 'pointer' : 'default' }}
              >
                {m.role === 'ai' && (
                  <div className="flex items-center gap-2 mb-1 opacity-70">
                    <Bot className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wide">IA</span>
                  </div>
                )}
                <p>{m.text}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Composer */}
      <footer className="border-t border-zinc-800/60 bg-zinc-950/80 backdrop-blur sticky bottom-0">
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
