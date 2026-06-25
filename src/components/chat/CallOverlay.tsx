'use client'

/**
 * CallOverlay placeholder. WebRTC signaling via socket.io was removed because
 * the gateway can't proxy the mini-service port. Calls are temporarily disabled.
 * The buttons in ChatView still dispatch 'nx:start-call' but this component
 * shows a friendly message instead of trying to connect.
 */
import { useEffect, useState } from 'react'

export function CallOverlay() {
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const handler = () => {
      setMsg('Las llamadas de voz y video estarán disponibles próximamente.')
      setTimeout(() => setMsg(null), 3000)
    }
    window.addEventListener('nx:start-call', handler)
    return () => window.removeEventListener('nx:start-call', handler)
  }, [])

  if (!msg) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-4 max-w-sm text-center">
        <p className="text-sm text-zinc-300">{msg}</p>
      </div>
    </div>
  )
}
