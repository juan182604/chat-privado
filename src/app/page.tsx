'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { AiLoginScreen } from '@/components/auth/AiLoginScreen'
import { AuthModal } from '@/components/auth/AuthModal'
import { MainApp } from '@/components/chat/MainApp'

export default function Home() {
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  // On first render (SSR + initial client render), ALWAYS show AiLoginScreen.
  // Only show MainApp after the client has confirmed a valid session via /api/auth/me.
  const [sessionChecked, setSessionChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me', { cache: 'no-store' as RequestCache })
      .then((r) => r.json())
      .then(async (data) => {
        if (cancelled) return
        if (data && data.user) {
          setUser(data.user)
        } else {
          // No valid session — clear local store AND call logout to delete any stale cookie
          setUser(null)
          try {
            await fetch('/api/auth/logout', { method: 'POST' })
          } catch {}
        }
        setSessionChecked(true)
      })
      .catch(() => {
        if (cancelled) return
        setSessionChecked(true)
      })
    return () => { cancelled = true }
  }, [setUser])

  // Only render MainApp if user is set AND session was verified by the client.
  const showApp = sessionChecked && user

  return (
    <>
      {showApp ? <MainApp /> : <AiLoginScreen />}
      <AuthModal />
    </>
  )
}
