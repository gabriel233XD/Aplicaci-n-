// Instalar IngresaYa como app (PWA): botón "Instalar" en Android/Chrome e instrucciones en iPhone.
import { useEffect, useState } from 'react'

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallPromptEvent
    listeners.forEach((l) => l())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((l) => l())
  })
}

export function isStandalone(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  } catch {
    return false
  }
}

export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/** Registra el service worker (solo en la app publicada; no dentro de otras páginas). */
export function registerServiceWorker() {
  try {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator) || window.self !== window.top) return
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined)
    })
  } catch {
    // ignorar
  }
}

const DISMISS_KEY = 'ingresaya:install-dismissed'

export function useInstall() {
  const [, force] = useState(0)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])

  const installed = isStandalone()
  return {
    /** Android/Chrome: se puede instalar con un toque. */
    canPrompt: !!deferred && !installed && !dismissed,
    /** iPhone: hay que hacerlo desde el menú Compartir. */
    showIOSHelp: isIOS() && !installed && !dismissed,
    async install() {
      if (!deferred) return
      await deferred.prompt()
      await deferred.userChoice.catch(() => undefined)
      deferred = null
      force((n) => n + 1)
    },
    dismiss() {
      try {
        localStorage.setItem(DISMISS_KEY, '1')
      } catch {
        // ignorar
      }
      setDismissed(true)
    },
  }
}
