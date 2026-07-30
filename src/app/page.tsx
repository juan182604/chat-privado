'use client'

import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { AiLoginScreen } from '@/components/auth/AiLoginScreen'
import { AuthModal } from '@/components/auth/AuthModal'
import { MainApp } from '@/components/chat/MainApp'

export default function Home() {
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const [sessionChecked, setSessionChecked] = useState(false)
  const lastVerifyRef = useRef<number>(0)

  // Check session on mount only (not on every user change)
  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me', { cache: 'no-store' as RequestCache })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data && data.user) {
          setUser(data.user)
        } else {
          setUser(null)
        }
        setSessionChecked(true)
      })
      .catch(() => {
        if (cancelled) return
        setSessionChecked(true)
      })
    return () => { cancelled = true }
  }, [setUser])

  // Periodically verify the session is still valid (every 60 seconds)
  // But NOT immediately after login — wait at least 5 seconds
  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => {
      const now = Date.now()
      if (now - lastVerifyRef.current < 30000) return // Don't verify more than once per 30s
      lastVerifyRef.current = now
      fetch('/api/auth/me', { cache: 'no-store' as RequestCache })
        .then((r) => r.json())
        .then((data) => {
          if (!data || !data.user) {
            // Session expired on server, clear local state
            setUser(null)
          }
        })
        .catch(() => {})
    }, 60000) // Check every 60 seconds
    return () => clearInterval(interval)
  }, [user, setUser])

  const showApp = sessionChecked && user

  return (
    <>
      {showApp ? <MainApp /> : <AiLoginScreen />}
      <AuthModal />
    </>
  )
}
