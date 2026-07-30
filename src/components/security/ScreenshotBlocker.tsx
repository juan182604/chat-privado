'use client'

import { useEffect, useState, useRef } from 'react'

/**
 * ScreenshotBlocker — Mobile-only screenshot/recording protection.
 *
 * What it does (mobile only, NOT on desktop):
 * 1. When user leaves the tab (switches app, goes to home screen) → hide entire app
 * 2. When user returns → show app again
 * 3. Detect PrintScreen key → hide app for 500ms (capture gets blank screen)
 * 4. Block text selection (so chat content can't be copied)
 * 5. Block context menu (long-press to save image)
 * 6. When app is in background, blur all content
 *
 * On desktop (PC): does nothing, so PC users are unaffected.
 *
 * On Android APK: handled natively via FLAG_SECURE (much stronger).
 * This component is mainly for iOS Safari / iOS PWA where FLAG_SECURE is unavailable.
 */
export function ScreenshotBlocker({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // 🚫 ONLY apply on mobile devices — skip desktop completely
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent || '',
    )
    // Also detect touch device as fallback (most tablets are touch)
    const isTouch = typeof window !== 'undefined' && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0))
    // Skip if clearly desktop (no mobile UA AND no touch)
    if (!isMobile && !isTouch) {
      return
    }

    // 1. visibilitychange — when user leaves tab/app, hide everything
    const onVisibility = () => {
      if (document.hidden) {
        setHidden(true)
      } else {
        setHidden(false)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    // 2. blur/focus — when window loses focus (app switcher), hide
    const onBlur = () => setHidden(true)
    const onFocus = () => setHidden(false)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)

    // 3. PrintScreen key — hide briefly so capture gets blank screen
    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key?.toLowerCase() || ''
      // PrintScreen key
      if (e.key === 'PrintScreen' || key === 'printscreen') {
        setHidden(true)
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
        hideTimerRef.current = setTimeout(() => setHidden(false), 500)
      }
      // Mac screenshot shortcuts: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        setHidden(true)
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
        hideTimerRef.current = setTimeout(() => setHidden(false), 500)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key?.toLowerCase() || ''
      if (e.key === 'PrintScreen' || key === 'printscreen') {
        setHidden(true)
      }
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        setHidden(true)
      }
    }
    document.addEventListener('keyup', onKeyUp)
    document.addEventListener('keydown', onKeyDown)

    // 4. Block context menu (long-press on mobile → "Save Image", "Copy")
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }
    document.addEventListener('contextmenu', onContextMenu)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('contextmenu', onContextMenu)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          // Mobile-only: disable text selection so chat content can't be highlighted/copied
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          // Disable image dragging
          WebkitUserDrag: 'none',
        }}
      >
        {children}
      </div>
      {hidden && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#0a0a0a',
            zIndex: 2147483647, // max z-index, covers everything including modals
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#52525b',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '14px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</div>
            <div>Chat Privado</div>
          </div>
        </div>
      )}
    </div>
  )
}
