'use client'

import { useAppStore } from '@/lib/store'
import { AiLoginScreen } from '@/components/auth/AiLoginScreen'
import { AuthModal } from '@/components/auth/AuthModal'
import { MainApp } from '@/components/chat/MainApp'
import { useEffect } from 'react'

export default function Home() {
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)

  // When the app is hidden (user switches apps, closes tab, locks phone),
  // automatically log out and return to the AI screen.
  // When they come back, they must do the whole process again (entrar → hold 5s → login).
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && user) {
        // App is being hidden — log out immediately
        try {
          await fetch('/api/auth/logout', { method: 'POST' })
        } catch {}
        setUser(null)
        // Force reload to clear all state
        window.location.reload()
      }
    }

    const handleBlur = async () => {
      // Also handle blur (when user taps outside the webview on Android APK)
      if (user) {
        // Small delay to avoid false triggers from internal focus changes
        setTimeout(async () => {
          if (!document.hasFocus() && user) {
            try {
              await fetch('/api/auth/logout', { method: 'POST' })
            } catch {}
            setUser(null)
            window.location.reload()
          }
        }, 500)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
    }
  }, [user, setUser])

  return (
    <>
      {user ? <MainApp /> : <AiLoginScreen />}
      <AuthModal />
    </>
  )
}
