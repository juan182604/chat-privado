'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { AiLoginScreen } from '@/components/auth/AiLoginScreen'
import { AuthModal } from '@/components/auth/AuthModal'
import { MainApp } from '@/components/chat/MainApp'

export default function Home() {
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data && data.user) {
          setUser(data.user)
        }
        setReady(true)
      })
      .catch(() => {
        setReady(true)
      })
  }, [setUser])

  return (
    <>
      {ready && user ? <MainApp /> : <AiLoginScreen />}
      <AuthModal />
    </>
  )
}
