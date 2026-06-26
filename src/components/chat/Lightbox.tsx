'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Full-screen image viewer.
 * Renders via portal at document.body level with MAXIMUM z-index.
 * Uses inline styles with !important to override ALL CSS rules.
 */
export function Lightbox({
  src,
  alt = '',
  onClose,
}: {
  src: string
  alt?: string
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed !important' as any,
        top: '0 !important',
        left: '0 !important',
        right: '0 !important',
        bottom: '0 !important',
        width: '100vw !important',
        height: '100vh !important',
        zIndex: '2147483647 !important',
        background: '#000 !important',
        display: 'flex !important',
        alignItems: 'center !important',
        justifyContent: 'center !important',
        overflow: 'visible !important',
        padding: '0 !important',
        margin: '0 !important',
      }}
    >
      {/* Close button (X) */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.25)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          zIndex: 2147483647,
          border: 'none',
          cursor: 'pointer',
          fontSize: '24px',
          fontWeight: 'bold',
          touchAction: 'manipulation',
        }}
        aria-label="Cerrar foto"
      >
        ✕
      </button>

      {/* Full-screen image */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          zIndex: 1,
        }}
      />
    </div>,
    document.body
  )
}
