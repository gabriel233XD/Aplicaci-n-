import { TUTOR_LIMITS, TUTOR_RULES, type TutorTurn } from './tutorPrompt'
import { dayKey } from './game'

// El tutor funciona de dos formas:
// 1. Dentro de claude.ai (el link de prueba): usa la capacidad "sample" del visor,
//    que responde con la cuenta de Claude de quien abre la página.
// 2. Publicada por tu cuenta (por ejemplo en Vercel): llama a /api/tutor,
//    que usa la API de Claude con tu clave guardada en el servidor.

type SampleFn = (
  input: TutorTurn[],
  options: { onText?: (u: { text: string }) => void; signal?: AbortSignal; modelTier?: string; cache?: boolean },
) => Promise<{ text: string; truncated: boolean }>

type ClaudeHost = { use: (name: string) => Promise<unknown> }

let samplePromise: Promise<SampleFn | null> | null = null

function getSample(): Promise<SampleFn | null> {
  if (!samplePromise) {
    const host = (window as unknown as { claude?: ClaudeHost }).claude
    samplePromise = host?.use
      ? host.use('sample').then((s) => (typeof s === 'function' ? (s as SampleFn) : null)).catch(() => null)
      : Promise.resolve(null)
  }
  return samplePromise
}

export type TutorErrorKind = 'unavailable' | 'denied' | 'busy' | 'refused' | 'failed' | 'cancelled' | 'login' | 'limit'

export class TutorError extends Error {
  kind: TutorErrorKind
  partial?: string
  constructor(kind: TutorErrorKind, partial?: string) {
    super(kind)
    this.kind = kind
    this.partial = partial
  }
}

/** "sample": dentro de claude.ai (usa la IA del visor). "server": la app publicada (usa /api/tutor). */
export async function tutorMode(): Promise<'sample' | 'server'> {
  return (await getSample()) ? 'sample' : 'server'
}

/** Recorta la conversación: siempre se conserva el contexto de la pregunta (primer turno). */
function trimTurns(turns: TutorTurn[]): TutorTurn[] {
  const clipped = turns.map((t) => ({ ...t, content: t.content.slice(0, TUTOR_LIMITS.maxCharsPerTurn * 2) }))
  if (clipped.length <= TUTOR_LIMITS.maxTurns) return clipped
  const rest = clipped.slice(-(TUTOR_LIMITS.maxTurns - 1))
  // La lista debe empezar con el alumno después del contexto.
  while (rest.length && rest[0].role !== 'user') rest.shift()
  return [clipped[0], ...rest]
}

/**
 * Pide una respuesta al tutor.
 * `context` describe la pregunta; `turns` es la conversación (termina con el alumno).
 */
export async function askTutor(
  context: string,
  turns: TutorTurn[],
  opts: {
    onText: (text: string) => void
    signal: AbortSignal
    /** Token de la sesión del alumno (cuentas activadas). */
    token?: string
    /** Recibe cuántas consultas le quedan hoy, según el servidor. */
    onRemaining?: (left: number) => void
  },
): Promise<string> {
  const convo = trimTurns(turns)
  const sample = await getSample()

  if (sample) {
    // Sin "system prompt" en este modo: las reglas van en el primer turno.
    const input: TutorTurn[] = [
      { role: 'user', content: `${TUTOR_RULES}\n\n---\n${context}\n---\n\n${convo[0].content}` },
      ...convo.slice(1),
    ]
    try {
      const { text } = await sample(input, {
        onText: ({ text }) => opts.onText(text),
        signal: opts.signal,
        modelTier: 'quick',
        cache: false,
      })
      return text
    } catch (e) {
      const err = e as { code?: string; text?: string }
      const kind: TutorErrorKind =
        err.code === 'cancelled'
          ? 'cancelled'
          : err.code === 'not_granted' || err.code === 'sampling_disabled' || err.code === 'not_declared'
            ? 'denied'
            : err.code === 'rate_limited'
              ? 'busy'
              : err.code === 'refused'
                ? 'refused'
                : 'failed'
      throw new TutorError(kind, err.text)
    }
  }

  let res: Response
  try {
    res = await fetch('/api/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
      body: JSON.stringify({ context, turns: convo }),
      signal: opts.signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new TutorError('cancelled')
    throw new TutorError('unavailable')
  }
  if (res.status === 404 || res.status === 503) throw new TutorError('unavailable')
  if (res.status === 401) throw new TutorError('login')
  if (res.status === 429) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new TutorError(body.error === 'limit' ? 'limit' : 'busy')
  }
  const remaining = res.headers.get('x-tutor-remaining')
  if (remaining !== null && opts.onRemaining) opts.onRemaining(Number(remaining))
  if (!res.ok || !res.body) throw new TutorError('failed')
  // Un hosting sin la función /api/tutor puede devolver la página HTML en su lugar.
  if (!(res.headers.get('content-type') ?? '').startsWith('text/plain')) throw new TutorError('unavailable')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      text += decoder.decode(value, { stream: true })
      opts.onText(text)
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new TutorError('cancelled', text)
    throw new TutorError('failed', text)
  }
  if (text.includes('\u0000REFUSED')) throw new TutorError('refused')
  if (!text.trim()) throw new TutorError('failed')
  return text
}

// ── Límite diario de consultas (prototipo: se guarda en el navegador) ──

const USAGE_KEY = 'ingresaya:tutor-usage'

export function tutorUsedToday(): number {
  try {
    const raw = JSON.parse(localStorage.getItem(USAGE_KEY) ?? 'null') as { day: string; count: number } | null
    return raw && raw.day === dayKey() ? raw.count : 0
  } catch {
    return 0
  }
}

export function countTutorQuestion() {
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify({ day: dayKey(), count: tutorUsedToday() + 1 }))
  } catch {
    // ignorar
  }
}
