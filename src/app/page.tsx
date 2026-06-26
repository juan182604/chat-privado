'use client'

import { useAppStore } from '@/lib/store'
import { AiLoginScreen } from '@/components/auth/AiLoginScreen'
import { AuthModal } from '@/components/auth/AuthModal'
import { MainApp } from '@/components/chat/MainApp'

export default function Home() {
  const user = useAppStore((s) => s.user)

  return (
    <>
      {user ? <MainApp /> : <AiLoginScreen />}
      <AuthModal />
    </>
  )
}
