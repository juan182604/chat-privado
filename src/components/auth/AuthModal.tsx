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
  const [stayOpen, setStayOpen] = useState(true)

  useEffect(() => {
    const handler = () => { setError(null); setOpen(true) }
    window.addEventListener('nx:show-auth', handler)
    return () => window.removeEventListener('nx:show-auth', handler)
  }, [])

  const close = () => { setOpen(false); setError(null) }

  const submitLogin = async () => {
    setError(null)
    setLoading(true)
    try {
      // Read values directly from DOM (React 19 compatible)
      const inputs = document.querySelectorAll('input')
      let username = '', pin = ''
      for (const inp of inputs) {
        const p = (inp.placeholder || '').toLowerCase()
        if (p.includes('usuario')) username = inp.value
        if (p.includes('pin')) pin = inp.value
      }
      if (!username || pin.length !== 6) {
        setError('Usuario y PIN de 6 dígitos requeridos')
        setLoading(false)
        return
      }
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin, persistent: stayOpen }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error'); setLoading(false); return }
      setUser(data.user)
      setOpen(false)
      setView({ kind: 'app' })
      window.location.reload()
    } catch {
      setLoading(false)
    }
  }

  const submitRegister = async () => {
    setError(null)
    setLoading(true)
    try {
      const inputs = document.querySelectorAll('input')
      let username = '', firstName = '', lastName = '', pin = '', pin2 = ''
      let pinIndex = 0
      for (const inp of inputs) {
        const p = (inp.placeholder || '').toLowerCase()
        if (p.includes('usuario') && !p.includes('iniciar')) username = inp.value
        if (p.includes('nombre')) firstName = inp.value
        if (p.includes('apellido')) lastName = inp.value
        if (p.includes('pin')) {
          pinIndex++
          if (pinIndex === 1) pin = inp.value
          if (pinIndex === 2) pin2 = inp.value
        }
      }
      if (pin !== pin2) { setError('Los PIN no coinciden'); setLoading(false); return }
      if (!username || !firstName || !lastName || pin.length !== 6) {
        setError('Todos los campos son requeridos'); setLoading(false); return
      }
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, firstName, lastName, pin, persistent: stayOpen }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error'); setLoading(false); return }
      setUser(data.user)
      setOpen(false)
      setView({ kind: 'app' })
      window.location.reload()
    } catch {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <h2 className="font-semibold text-zinc-100">{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
          <button onClick={close} className="text-zinc-400 hover:text-zinc-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 py-5 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-300">{error}</div>}
          {mode === 'login' ? (
            <>
              <Field label="Usuario" icon={<AtSign className="w-4 h-4" />}>
                <input placeholder="tu_usuario" className="bg-transparent flex-1 outline-none text-sm" />
              </Field>
              <Field label="PIN (6 dígitos)" icon={<KeyRound className="w-4 h-4" />}>
                <input type="password" inputMode="numeric" maxLength={6} placeholder="000000" className="bg-transparent flex-1 outline-none text-sm tracking-widest" />
                <button type="button" onClick={() => setShowPin(v => !v)} className="text-zinc-400 hover:text-zinc-100">{showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </Field>
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={stayOpen} onChange={e => setStayOpen(e.target.checked)} className="accent-emerald-500" />
                Mantener sesión abierta
              </label>
              <button onClick={submitLogin} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-semibold text-sm">
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
              <p className="text-center text-sm text-zinc-400">¿No tienes cuenta? <button onClick={() => { setMode('register'); setError(null) }} className="text-emerald-400 hover:underline">Regístrate</button></p>
            </>
          ) : (
            <>
              <Field label="Usuario" icon={<AtSign className="w-4 h-4" />}>
                <input placeholder="3-20: minúsculas, números, _" maxLength={20} className="bg-transparent flex-1 outline-none text-sm" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre" icon={<User className="w-4 h-4" />}>
                  <input maxLength={40} className="bg-transparent flex-1 outline-none text-sm" />
                </Field>
                <Field label="Apellido" icon={<User className="w-4 h-4" />}>
                  <input maxLength={40} className="bg-transparent flex-1 outline-none text-sm" />
                </Field>
              </div>
              <Field label="PIN (6 dígitos)" icon={<KeyRound className="w-4 h-4" />}>
                <input type="password" inputMode="numeric" maxLength={6} placeholder="000000" className="bg-transparent flex-1 outline-none text-sm tracking-widest" />
              </Field>
              <Field label="Confirmar PIN" icon={<KeyRound className="w-4 h-4" />}>
                <input type="password" inputMode="numeric" maxLength={6} placeholder="000000" className="bg-transparent flex-1 outline-none text-sm tracking-widest" />
              </Field>
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={stayOpen} onChange={e => setStayOpen(e.target.checked)} className="accent-emerald-500" />
                Mantener sesión abierta
              </label>
              <button onClick={submitRegister} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-semibold text-sm">
                {loading ? 'Creando…' : 'Crear cuenta'}
              </button>
              <p className="text-center text-sm text-zinc-400">¿Ya tienes cuenta? <button onClick={() => { setMode('login'); setError(null) }} className="text-emerald-400 hover:underline">Inicia sesión</button></p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
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
