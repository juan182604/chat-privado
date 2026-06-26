'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { useShallow } from 'zustand/react/shallow'
import { AiLoginScreen } from '@/components/auth/AiLoginScreen'
import { AuthModal } from '@/components/auth/AuthModal'
import { MainApp } from '@/components/chat/MainApp'

export default function Home() {
  const { user, setUser } = useAppStore(useShallow((s) => ({ user: s.user, setUser: s.setUser })))

  useEffect(() => {
    if (!user) return

    let timer: ReturnType<typeof setTimeout> | null = null

    const logout = async () => {
      try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
      setUser(null)
      window.location.reload()
    }

    const resetTimer = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(logout, 2 * 60 * 1000)
    }

    const onVis = () => { if (document.hidden) logout() }

    const events = ['mousedown', 'mousemove', 'touchstart', 'keydown', 'scroll']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    document.addEventListener('visibilitychange', onVis)
    resetTimer()

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      document.removeEventListener('visibilitychange', onVis)
      if (timer) clearTimeout(timer)
    }
  }, [user, setUser])

  return (
    <>
      {user ? <MainApp /> : <AiLoginScreen />}
      <AuthModal />
    </>
  )
}
