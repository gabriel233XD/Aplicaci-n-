// Enlaces para compartir (invitaciones y duelos).

export function appUrl(params: Record<string, string>): string {
  const url = new URL(window.location.origin + '/')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return url.toString()
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

/** Comparte con el menú del celular si existe; si no, copia el texto. Devuelve qué pasó. */
export async function shareOrCopy(text: string, url: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share({ text, url })
      return 'shared'
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'failed'
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`)
    return 'copied'
  } catch {
    return 'failed'
  }
}

// ── Parámetros que llegan en el enlace (?ref=CODIGO o ?duelo=ID) ──

const REF_KEY = 'ingresaya:ref'
const DUEL_KEY = 'ingresaya:duel'

/** Guarda los parámetros del enlace y limpia la dirección. Se llama una vez al abrir la app. */
export function captureLinkParams() {
  try {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    const duel = params.get('duelo')
    if (ref && /^[A-Za-z0-9]{4,12}$/.test(ref)) localStorage.setItem(REF_KEY, ref.toUpperCase())
    if (duel && /^[0-9a-f-]{36}$/i.test(duel)) localStorage.setItem(DUEL_KEY, duel)
    if (ref || duel) {
      params.delete('ref')
      params.delete('duelo')
      const rest = params.toString()
      window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash)
    }
  } catch {
    // ignorar
  }
}

function take(key: string): string | null {
  try {
    const v = localStorage.getItem(key)
    return v
  } catch {
    return null
  }
}

function drop(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignorar
  }
}

export const pendingRef = () => take(REF_KEY)
export const clearRef = () => drop(REF_KEY)
export const pendingDuel = () => take(DUEL_KEY)
export const clearDuel = () => drop(DUEL_KEY)
