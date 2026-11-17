// La app se puede abrir más rápido gracias al service worker.
// (El botón "Instalar" se agregará cuando exista la versión APK.)

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
