'use client'

import { useEffect, useRef, useState } from 'react'
import { useAppStore, ChatMessage } from '@/lib/store'
import { VoicePlayer } from '@/components/chat/VoicePlayer'
import { Lightbox } from '@/components/chat/Lightbox'
import { ArrowLeft, Phone, Video, Send, Paperclip, Mic, ImageIcon, X, Clock, Timer } from 'lucide-react'

// Preset photo timer options (in seconds).
// null = "sin límite" (follows the normal 10-hour rule)
const PHOTO_TIMER_PRESETS: { label: string; value: number | null }[] = [
  { label: 'Sin límite', value: null },
  { label: '1s', value: 1 },
  { label: '2s', value: 2 },
  { label: '5s', value: 5 },
  { label: '10s', value: 10 },
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '5m', value: 300 },
  { label: '10m', value: 600 },
  { label: '1h', value: 3600 },
]

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return '0s'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return s === 0 ? `${m}m` : `${m}m ${s}s`
  const h = Math.floor(m / 60)
  const mm = m % 60
  return mm === 0 ? `${h}h` : `${h}h ${mm}m`
}

export function ChatView({ peerId, onBack }: { peerId: string; onBack: () => void }) {
  const user = useAppStore((s) => s.user)
  const messages = useAppStore((s) => s.messages[peerId] ?? [])
  const setMessages = useAppStore((s) => s.setMessages)
  const appendMessage = useAppStore((s) => s.appendMessage)
  const markRead = useAppStore((s) => s.markRead)

  const [peer, setPeer] = useState<{ uniqueId: string; username: string; firstName: string; lastName: string } | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showAttach, setShowAttach] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordSecs, setRecordSecs] = useState(0)
  // Photo send dialog: when a file is selected, the user picks a timer before sending.
  const [photoToSend, setPhotoToSend] = useState<{ file: File; preview: string } | null>(null)
  const [photoTimer, setPhotoTimer] = useState<number | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordChunksRef = useRef<Blob[]>([])
  const recordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load initial conversation when peerId changes
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setMessages(peerId, [])
      try {
        const res = await fetch(`/api/messages/send?peerUniqueId=${peerId}`)
        const data = await res.json()
        if (cancelled) return
        if (res.ok) {
          setMessages(peerId, data.messages)
          setPeer(data.peer)

          // Check if there are any photos with a pending timer (not yet started)
          // OR any unread messages. Either way we need to call /api/messages/read
          // to start the photo timers and mark as read.
          const hasUnread = data.messages.some((m: ChatMessage) => !m.fromMe && !m.readAt)
          const hasPendingPhotos = data.messages.some(
            (m: ChatMessage) => !m.fromMe && m.type === 'photo' && m.photoExpiresSeconds && !m.photoViewStartedAt,
          )

          if (hasUnread || hasPendingPhotos) {
            const r = await fetch('/api/messages/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ peerUniqueId: peerId }),
            })
            const rd = await r.json()
            if (!cancelled) markRead(peerId, rd.marked || [])
            // Re-fetch the conversation so we get the updated photoViewStartedAt
            // for any photos whose timer just started.
            const res2 = await fetch(`/api/messages/send?peerUniqueId=${peerId}`)
            const data2 = await res2.json()
            if (!cancelled && res2.ok) {
              setMessages(peerId, data2.messages)
            }
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [peerId, setMessages, markRead])

  // Listen for "refresh conversation" events (e.g. when a photo self-destructs)
  usePhotoExpiryRefresher(peerId, setMessages)

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const sendText = async () => {
    const text = input.trim()
    if (!text || sending || !user) return
    setInput('')
    setSending(true)
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUniqueId: peerId, type: 'text', content: text }),
      })
      const data = await res.json()
      if (res.ok) {
        appendMessage(peerId, { ...data.message, fromMe: true })
      }
    } finally {
      setSending(false)
    }
  }

  // When the user picks a file, open the photo-timer dialog
  const onPhotoSelected = (file: File) => {
    setShowAttach(false)
    const preview = URL.createObjectURL(file)
    setPhotoToSend({ file, preview })
    setPhotoTimer(null) // default = sin límite
  }

  const confirmSendPhoto = async () => {
    if (!photoToSend || !user) return
    const { file } = photoToSend
    setPhotoToSend(null)
    const form = new FormData()
    form.append('file', file)
    setSending(true)
    try {
      const up = await fetch('/api/upload/photo', { method: 'POST', body: form })
      const ud = await up.json()
      if (!up.ok) return
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUniqueId: peerId,
          type: 'photo',
          mediaPath: ud.mediaPath,
          photoExpiresSeconds: photoTimer, // null or a number
        }),
      })
      const data = await res.json()
      if (res.ok) {
        appendMessage(peerId, { ...data.message, fromMe: true })
      }
    } finally {
      setSending(false)
    }
  }

  const cancelPhotoSend = () => {
    if (photoToSend) URL.revokeObjectURL(photoToSend.preview)
    setPhotoToSend(null)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Choose the best supported mime type for recording
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ]
      let mimeType = ''
      for (const mt of mimeTypes) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mt)) {
          mimeType = mt
          break
        }
      }

      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      recordChunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) recordChunksRef.current.push(e.data)
      }
      mr.onstop = async () => {
        const finalMime = mimeType || 'audio/webm'
        const ext = finalMime.includes('mp4') ? 'm4a' : finalMime.includes('ogg') ? 'ogg' : 'webm'
        const blob = new Blob(recordChunksRef.current, { type: finalMime })
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: finalMime })
        const form = new FormData()
        form.append('file', file)
        setSending(true)
        try {
          const up = await fetch('/api/upload/voice', { method: 'POST', body: form })
          const ud = await up.json()
          if (!up.ok) return
          const res = await fetch('/api/messages/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toUniqueId: peerId, type: 'voice', mediaPath: ud.mediaPath }),
          })
          const data = await res.json()
          if (res.ok) {
            appendMessage(peerId, { ...data.message, fromMe: true })
          }
        } finally {
          setSending(false)
        }
        stream.getTracks().forEach((t) => t.stop())
      }
      mr.start()
      setRecording(true)
      setRecordSecs(0)
      recordIntervalRef.current = setInterval(() => setRecordSecs((s) => s + 1), 1000)
    } catch {
      alert('No se pudo acceder al micrófono')
    }
  }

  const stopRecording = (cancel: boolean = false) => {
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current)
    setRecording(false)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (cancel) {
        mediaRecorderRef.current.onstop = () => {
          mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop())
        }
      }
      mediaRecorderRef.current.stop()
    }
  }

  const startCall = (kind: 'voice' | 'video') => {
    if (!user || !peer) return
    window.dispatchEvent(
      new CustomEvent('nx:start-call', { detail: { peerUniqueId: peerId, peerName: peer.username, kind } }),
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-zinc-500">
        <div className="animate-pulse">Cargando conversación…</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 relative">
      {/* Header */}
      <header className="border-b border-zinc-800/60 px-3 py-2 flex items-center gap-2 ">
        <button onClick={onBack} className="p-2 text-zinc-400 hover:text-zinc-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold">
          {peer?.firstName.charAt(0).toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-zinc-100 truncate">{peer?.displayName || peer?.username}</p>
          <p className="text-[11px] text-zinc-500 font-mono">#{peer?.uniqueId}</p>
        </div>
        <button onClick={() => startCall('voice')} className="p-2 text-zinc-400 hover:text-emerald-400" title="Llamar">
          <Phone className="w-5 h-5" />
        </button>
        <button onClick={() => startCall('video')} className="p-2 text-zinc-400 hover:text-emerald-400" title="Videollamar">
          <Video className="w-5 h-5" />
        </button>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-sm text-zinc-500 mt-12">
            Sin mensajes todavía. Escribe algo para empezar.
            <br />
            <span className="text-[11px] opacity-70">
              Los mensajes se borrarán automáticamente a las 10 horas.
            </span>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} myId={user?.uniqueId ?? ''} />
        ))}
      </div>

      {/* Attach menu */}
      {showAttach && (
        <div className="absolute bottom-20 left-3 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl p-2 flex flex-col gap-1 z-20">
          <label className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 rounded-lg cursor-pointer text-sm text-zinc-200">
            <ImageIcon className="w-4 h-4 text-emerald-400" />
            Foto
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onPhotoSelected(f)
              }}
            />
          </label>
          <p className="text-[10px] text-zinc-500 px-3 pb-1">Solo fotos — no videos.</p>
        </div>
      )}

      {/* Recording bar */}
      {recording && (
        <div className="px-4 py-3 bg-red-500/10 border-t border-red-500/30 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-red-300">Grabando… {recordSecs}s</span>
          <div className="flex-1" />
          <button onClick={() => stopRecording(true)} className="text-xs text-zinc-400 hover:text-red-400 px-2">
            Cancelar
          </button>
          <button onClick={() => stopRecording(false)} className="bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg text-xs text-white">
            Enviar
          </button>
        </div>
      )}

      {/* Composer */}
      {!recording && (
        <footer className="border-t border-zinc-800/60 px-2 py-2 flex items-center gap-1 bg-zinc-950">
          <button
            onClick={() => setShowAttach((v) => !v)}
            className="p-2 text-zinc-400 hover:text-zinc-100"
            title="Adjuntar"
          >
            {showAttach ? <X className="w-5 h-5" /> : <Paperclip className="w-5 h-5" />}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendText()}
            placeholder="Escribe un mensaje…"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-full px-4 py-2 text-sm outline-none focus:border-emerald-500 text-zinc-100"
          />
          {input.trim() ? (
            <button
              onClick={sendText}
              disabled={sending}
              className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300"
              title="Nota de voz"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </footer>
      )}

      {/* Photo send dialog — pick self-destruct timer before sending */}
      {photoToSend && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
                <Timer className="w-4 h-4 text-emerald-400" /> Enviar foto
              </h3>
              <button onClick={cancelPhotoSend} className="text-zinc-400 hover:text-zinc-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <img
                src={photoToSend.preview}
                alt="preview"
                className="w-full max-h-60 object-contain rounded-lg bg-zinc-950"
              />
              <div>
                <p className="text-xs text-zinc-400 mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  ¿Cuánto tiempo podrá verla el receptor?
                </p>
                <p className="text-[11px] text-zinc-500 mb-3 leading-relaxed">
                  El temporizador empieza cuando el receptor abre el chat. Si no lo abre,
                  la foto se queda esperando. Cuando se acaba el tiempo, la foto desaparece
                  del chat de ambos. En el panel admin se mantiene hasta las 10h.
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {PHOTO_TIMER_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setPhotoTimer(p.value)}
                      className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                        photoTimer === p.value
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={confirmSendPhoto}
                disabled={sending}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white py-2.5 rounded-lg font-semibold text-sm"
              >
                {sending ? 'Enviando…' : 'Enviar foto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ msg, myId }: { msg: ChatMessage; myId: string }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const time = new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (msg.type === 'call') {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-zinc-800/70 border border-zinc-700 rounded-full px-3 py-1.5 text-xs text-zinc-300 flex items-center gap-2">
          {msg.callKind === 'video' ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
          <span>
            {msg.fromMe ? 'Llamada' : 'Llamada entrante'} · {msg.callStatus}
            {msg.callDuration ? ` · ${Math.floor(msg.callDuration / 60)}:${String(msg.callDuration % 60).padStart(2, '0')}` : ''}
          </span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
            msg.fromMe ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
          }`}
        >
          {msg.type === 'text' && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}

          {msg.type === 'photo' && msg.mediaPath && (
            <>
              <img
                src={`/api/media?path=${encodeURIComponent(msg.mediaPath)}`}
                alt="foto"
                onClick={() => setLightboxOpen(true)}
                className="rounded-lg max-w-full max-h-72 mb-1 cursor-zoom-in hover:opacity-90 transition-opacity"
              />
              <PhotoTimerBadge msg={msg} />
            </>
          )}

          {msg.type === 'voice' && msg.mediaPath && <VoicePlayer path={msg.mediaPath} mine={msg.fromMe} />}

          <p className={`text-[10px] mt-1 ${msg.fromMe ? 'text-emerald-100/70' : 'text-zinc-500'}`}>
            {time}
            {msg.fromMe && (msg.readAt ? ' · ✓✓' : ' · ✓')}
          </p>
        </div>
      </div>
      {/* Lightbox OUTSIDE the bubble — renders at body level via portal */}
      {lightboxOpen && msg.mediaPath && (
        <Lightbox
          src={`/api/media?path=${encodeURIComponent(msg.mediaPath)}`}
          alt="foto"
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  )
}

/**
 * Polling-based photo refresher.
 * When a photo's self-destruct timer is about to expire (or has just expired),
 * this component periodically refreshes the conversation until the photo is
 * gone from the server response.
 */
function usePhotoExpiryRefresher(peerId: string, setMessages: (id: string, msgs: ChatMessage[]) => void) {
  useEffect(() => {
    // Listen for the custom event dispatched by ExpiredPhotoRefresh
    const handler = async () => {
      // Retry up to 8 times (8 x 1.5s = 12s) — the backend cleanup runs on poll
      for (let attempt = 0; attempt < 8; attempt++) {
        await new Promise((r) => setTimeout(r, 1500))
        try {
          const res = await fetch(`/api/messages/send?peerUniqueId=${peerId}`)
          const data = await res.json()
          if (res.ok) {
            const current = useAppStore.getState().messages[peerId] ?? []
            const currentIds = new Set(current.map((m) => m.id))
            const newIds = new Set((data.messages as any[]).map((m) => m.id))
            let changed = false
            for (const id of currentIds) {
              if (!newIds.has(id)) { changed = true; break }
            }
            setMessages(peerId, data.messages)
            if (changed) break
          }
        } catch {}
      }
    }
    window.addEventListener('nx:refresh-conversation', handler)
    return () => window.removeEventListener('nx:refresh-conversation', handler)
  }, [peerId, setMessages])
}

/**
 * Badge shown below a photo message that has a custom self-destruct timer.
 * - If the timer hasn't started yet (receiver hasn't opened chat): "⏱ visible Xs"
 * - If the timer is running: live countdown "⏱ Xs restantes"
 * - Sender always sees a hint that they set a timer.
 */
function PhotoTimerBadge({ msg }: { msg: ChatMessage }) {
  const [remaining, setRemaining] = useState<number | null>(() => {
    if (!msg.photoExpiresSeconds || !msg.photoViewStartedAt) return null
    const startedAt = new Date(msg.photoViewStartedAt).getTime()
    const expiresAt = startedAt + msg.photoExpiresSeconds * 1000
    return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
  })

  useEffect(() => {
    if (!msg.photoExpiresSeconds || !msg.photoViewStartedAt) {
      // Nothing to count down — either no timer, or timer hasn't started
      return
    }
    const startedAt = new Date(msg.photoViewStartedAt).getTime()
    const expiresAt = startedAt + msg.photoExpiresSeconds * 1000
    const tick = () => {
      const r = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
      setRemaining(r)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [msg.photoExpiresSeconds, msg.photoViewStartedAt])

  if (!msg.photoExpiresSeconds) return null

  const totalLabel = formatRemaining(msg.photoExpiresSeconds)

  // Timer not started yet — receiver hasn't opened the chat
  if (!msg.photoViewStartedAt) {
    return (
      <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-300/90">
        <Timer className="w-3 h-3" />
        <span>Visible {totalLabel} · inicia cuando abra el chat</span>
      </div>
    )
  }

  if (remaining === null) return null

  if (remaining <= 0) {
    // Timer expired — refresh the conversation so the photo disappears.
    // The backend has already marked it as photoExpired=true (via cleanup),
    // and the GET endpoint filters those out. We just need to re-fetch.
    return <ExpiredPhotoRefresh />
  }

  return (
    <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-300/90">
      <Timer className="w-3 h-3" />
      <span>{formatRemaining(remaining)} restante{remaining === 1 ? '' : 's'}</span>
    </div>
  )
}

/**
 * When rendered, this component triggers a one-time refresh of the conversation
 * via a custom event. The ChatView listens for this event and re-fetches the
 * conversation from the server, which will no longer include the expired photo.
 */
function ExpiredPhotoRefresh() {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nx:refresh-conversation'))
  }, [])
  return (
    <div className="flex items-center gap-1 mt-1 text-[10px] text-red-300/90">
      <Timer className="w-3 h-3" />
      <span>Expirada</span>
    </div>
  )
}
