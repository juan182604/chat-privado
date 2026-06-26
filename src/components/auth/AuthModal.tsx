'use client'

import { useEffect, useState } from 'react'
import { X, Eye, EyeOff, User, KeyRound, AtSign, Phone } from 'lucide-react'
import { useAppStore } from '@/lib/store'

type Mode = 'login' | 'register'

export function AuthModal() {
  const { setUser, setView } = useAppStore()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPin, setShowPin] = useState(false)

  // login fields
  const [loginUser, setLoginUser] = useState('')
  const [loginPin, setLoginPin] = useState('')
  const [stayOpen, setStayOpen] = useState(true)

  // register fields
  const [rUser, setRUser] = useState('')
  const [rFirst, setRFirst] = useState('')
  const [rLast, setRLast] = useState('')
  const [rPin, setRPin] = useState('')
  const [rPin2, setRPin2] = useState('')

  useEffect(() => {
    const handler = () => {
      setError(null)
      setOpen(true)
    }
    window.addEventListener('nx:show-auth', handler)
    return () => window.removeEventListener('nx:show-auth', handler)
  }, [])

  const close = () => {
    setOpen(false)
    setError(null)
  }

  const submitLogin = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, pin: loginPin, persistent: stayOpen }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión')
        return
      }
      setUser(data.user)
      setOpen(false)
      setView({ kind: 'app' })
      window.location.reload()
      window.location.reload()
      // No reload — the Zustand store already has the user, the page will
      // re-render from <AiLoginScreen> to <MainApp> immediately.
      // Reloading was causing the session lookup to race with the cookie
      // being set, kicking the user back to the AI screen.
    } finally {
      setLoading(false)
    }
  }

  const submitRegister = async () => {
    setError(null)
    if (rPin !== rPin2) {
      setError('Los PIN no coinciden')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: rUser,
          firstName: rFirst,
          lastName: rLast,
          pin: rPin,
          persistent: stayOpen,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al registrar')
        return
      }
      setUser(data.user)
      setOpen(false)
      setView({ kind: 'app' })
      window.location.reload()
      window.location.reload()
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <h2 className="font-semibold text-zinc-100">
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </h2>
          <button onClick={close} className="text-zinc-400 hover:text-zinc-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          {mode === 'login' ? (
            <>
              <Field label="Usuario" icon={<AtSign className="w-4 h-4" />}>
                <input
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value.toLowerCase())}
                  placeholder="tu_usuario"
                  className="bg-transparent flex-1 outline-none text-sm"
                />
              </Field>
              <Field label="PIN (6 dígitos)" icon={<KeyRound className="w-4 h-4" />}>
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="bg-transparent flex-1 outline-none text-sm tracking-widest"
                />
                <button type="button" onClick={() => setShowPin((v) => !v)} className="text-zinc-400 hover:text-zinc-100">
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </Field>
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stayOpen}
                  onChange={(e) => setStayOpen(e.target.checked)}
                  className="accent-emerald-500"
                />
                Mantener sesión abierta
              </label>
              <button
                onClick={submitLogin}
                disabled={loading || !loginUser || loginPin.length !== 6}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-semibold text-sm transition-colors"
              >
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
              <p className="text-center text-sm text-zinc-400">
                ¿No tienes cuenta?{' '}
                <button onClick={() => { setMode('register'); setError(null) }} className="text-emerald-400 hover:underline">
                  Regístrate
                </button>
              </p>
            </>
          ) : (
            <>
              <Field label="Usuario" icon={<AtSign className="w-4 h-4" />}>
                <input
                  value={rUser}
                  onChange={(e) => setRUser(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="3-20: minúsculas, números, _"
                  maxLength={20}
                  className="bg-transparent flex-1 outline-none text-sm"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre" icon={<User className="w-4 h-4" />}>
                  <input
                    value={rFirst}
                    onChange={(e) => setRFirst(e.target.value)}
                    maxLength={40}
                    className="bg-transparent flex-1 outline-none text-sm"
                  />
                </Field>
                <Field label="Apellido" icon={<User className="w-4 h-4" />}>
                  <input
                    value={rLast}
                    onChange={(e) => setRLast(e.target.value)}
                    maxLength={40}
                    className="bg-transparent flex-1 outline-none text-sm"
                  />
                </Field>
              </div>
              <Field label="PIN (6 dígitos)" icon={<KeyRound className="w-4 h-4" />}>
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  value={rPin}
                  onChange={(e) => setRPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="bg-transparent flex-1 outline-none text-sm tracking-widest"
                />
                <button type="button" onClick={() => setShowPin((v) => !v)} className="text-zinc-400 hover:text-zinc-100">
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </Field>
              <Field label="Confirmar PIN" icon={<KeyRound className="w-4 h-4" />}>
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  value={rPin2}
                  onChange={(e) => setRPin2(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="bg-transparent flex-1 outline-none text-sm tracking-widest"
                />
              </Field>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Al registrarte recibirás un <strong className="text-zinc-300">ID único de 6 caracteres</strong> (letras minúsculas + números).
                Las personas te agregarán solo con ese ID, no con tu nombre.
              </p>
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stayOpen}
                  onChange={(e) => setStayOpen(e.target.checked)}
                  className="accent-emerald-500"
                />
                Mantener sesión abierta (no pedir usuario cada vez)
              </label>
              <button
                onClick={submitRegister}
                disabled={loading || !rUser || !rFirst || !rLast || rPin.length !== 6 || rPin !== rPin2}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-semibold text-sm transition-colors"
              >
                {loading ? 'Creando…' : 'Crear cuenta'}
              </button>
              <p className="text-center text-sm text-zinc-400">
                ¿Ya tienes cuenta?{' '}
                <button onClick={() => { setMode('login'); setError(null) }} className="text-emerald-400 hover:underline">
                  Inicia sesión
                </button>
              </p>
            </>
          )}
        </div>

        <div className="border-t border-zinc-800 px-5 py-3 text-center text-[11px] text-zinc-500">
          <Phone className="inline w-3 h-3 mr-1" />
          Disponible en Android, iOS y web — mismo ID, misma cuenta.
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  icon,
  children,
}: {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wide text-zinc-500 mb-1">{label}</span>
      <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus-within:border-emerald-500">
        {icon && <span className="text-zinc-500">{icon}</span>}
        {children}
      </div>
    </label>
  )
}
