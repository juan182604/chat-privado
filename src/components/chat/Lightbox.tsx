'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Full-screen image viewer with a close button (X) at the top.
 * The image appears in the background (second plane) at full screen.
 * Tap anywhere outside the image, tap the X, or press Esc to close.
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

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Close button (X) at the top center — always visible and tappable */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className="absolute top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white z-20 backdrop-blur-md shadow-lg"
        aria-label="Cerrar foto"
        style={{ touchAction: 'manipulation' }}
      >
        <X className="w-6 h-6" />
      </button>

      {/* Full-screen image */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full object-contain"
        style={{ 
          position: 'relative',
          zIndex: 1,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
      />
    </div>
  )
}
