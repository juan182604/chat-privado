'use client'

import { useEffect, useState } from 'react'
import { useAppStore, CurrentUser } from '@/lib/store'
import { AiLoginScreen } from '@/components/auth/AiLoginScreen'
import { AuthModal } from '@/components/auth/AuthModal'
import { MainApp } from '@/components/chat/MainApp'

export default function Home() {
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const setView = useAppStore((s) => s.setView)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          cache: 'no-store' as RequestCache,
          credentials: 'include',
        })
        if (!res.ok) {
          if (!cancelled) setLoading(false)
          return
        }
        const data = await res.json()
        if (!cancelled && data.user) {
          setUser(data.user as CurrentUser)
          setView({ kind: 'app' })
        }
      } catch {
        // ignore network errors
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [setUser, setView])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 animate-pulse">Cargando…</div>
      </div>
    )
  }

  return (
    <>
      {user ? <MainApp /> : <AiLoginScreen />}
      <AuthModal />
    </>
  )
}
