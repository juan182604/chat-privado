'use client'

import { useEffect } from 'react'

/**
 * NO LONGER registers a service worker.
 * Instead, on mount it UNREGISTERS any existing service workers and clears caches
 * to ensure the app always loads the latest version from the server.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    // Unregister ALL service workers
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister()
      }
    })

    // Clear ALL caches
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          caches.delete(name)
        }
      })
    }
  }, [])

  return null
}
