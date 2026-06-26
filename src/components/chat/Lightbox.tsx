'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Full-screen image viewer via portal.
 * Uses a CSS class defined in globals.css for maximum priority.
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
    <div className="chat-lightbox-overlay" onClick={onClose}>
      <button
        className="chat-lightbox-close"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label="Cerrar foto"
      >
        ✕
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="chat-lightbox-image"
      />
    </div>,
    document.body
  )
}
