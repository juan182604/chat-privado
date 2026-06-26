'use client'

import { useAppStore } from '@/lib/store'
import { AiLoginScreen } from '@/components/auth/AiLoginScreen'
import { AuthModal } from '@/components/auth/AuthModal'
import { MainApp } from '@/components/chat/MainApp'
import { useEffect, useRef } from 'react'

const INACTIVITY_TIMEOUT = 2 * 60 * 1000 // 2 minutes

export default function Home() {
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Logout function — clears session and reloads to AI screen
  const forceLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    setUser(null)
    window.location.reload()
  }

  // Reset the inactivity timer on any user interaction
  const resetTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    if (user) {
      inactivityTimer.current = setTimeout(forceLogout, INACTIVITY_TIMEOUT)
    }
  }

  useEffect(() => {
    if (!user) return

    // === 1. INACTIVITY TIMER (2 minutes) ===
    // Any of these events reset the timer:
    const activityEvents = ['mousedown', 'mousemove', 'touchstart', 'touchmove', 'keydown', 'scroll', 'wheel']
    
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, resetTimer, { passive: true })
    })
    
    // Start the initial timer
    resetTimer()

    // === 2. VISIBILITY CHANGE (app hidden / phone locked) ===
    const handleVisibilityChange = () => {
      if (document.hidden) {
        forceLogout()
      }
    }

    // === 3. BLUR (user taps outside webview on Android) ===
    const handleBlur = () => {
      setTimeout(() => {
        if (!document.hasFocus()) {
          forceLogout()
        }
      }, 500)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, resetTimer)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    }
  }, [user, setUser])

  return (
    <>
      {user ? <MainApp /> : <AiLoginScreen />}
      <AuthModal />
    </>
  )
}
