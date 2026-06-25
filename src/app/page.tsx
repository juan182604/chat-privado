'use client'

import { useAppStore } from '@/lib/store'
import { AiLoginScreen } from '@/components/auth/AiLoginScreen'
import { AuthModal } from '@/components/auth/AuthModal'
import { MainApp } from '@/components/chat/MainApp'

export default function Home() {
  const user = useAppStore((s) => s.user)

  // On every page load / refresh, ALWAYS start at the AI screen.
  // The session is NOT restored — the user must type "entrar" and hold
  // the AI message for 5 seconds to open the login modal again.
  // This is by design: refreshing or closing the app = start over.
  return (
    <>
      {user ? <MainApp /> : <AiLoginScreen />}
      <AuthModal />
    </>
  )
}
