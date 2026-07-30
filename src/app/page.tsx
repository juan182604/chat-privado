'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { AiLoginScreen } from '@/components/auth/AiLoginScreen'
import { AuthModal } from '@/components/auth/AuthModal'
import { MainApp } from '@/components/chat/MainApp'

export default function Home() {
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const [sessionChecked, setSessionChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me', { cache: 'no-store' as RequestCache })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data && data.user) {
          setUser(data.user)
        } else {
          // No valid session — just clear local state. Do NOT call logout
          // because that would delete any in-flight session cookie.
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

  const showApp = sessionChecked && user

  return (
    <>
      {showApp ? <MainApp /> : <AiLoginScreen />}
      <AuthModal />
    </>
  )
}
