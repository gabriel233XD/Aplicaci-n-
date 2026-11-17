import { AnimatePresence, motion } from 'framer-motion'
import { GraduationCap, SendHorizontal, Sparkles, Square, X } from 'lucide-react'
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { TutorError, askTutor, countTutorQuestion, tutorUsedToday, type TutorErrorKind } from '../lib/tutor'
import { QUICK_REPLIES, TUTOR_LIMITS, openingRequest, questionContext, type TutorQuestion, type TutorTurn } from '../lib/tutorPrompt'
import { tap } from '../lib/ui-helpers'

type Props = {
  question: TutorQuestion
  chosen: number | null
  onClose: () => void
}

const ERROR_COPY: Record<TutorErrorKind, string> = {
  unavailable: 'El tutor todavía no está activado en esta versión de la app.',
  denied: 'No se dio permiso para usar la IA. Puedes activarlo en el menú de permisos de la página.',
  busy: 'Hay muchas consultas en este momento. Espera un minuto y vuelve a intentarlo.',
  refused: 'El tutor no pudo responder eso. Prueba preguntando de otra forma.',
  failed: 'Se cortó la conexión con el tutor. Toca "Reintentar".',
  cancelled: '',
}

/** Muestra texto simple con **negritas** y listas con guiones. */
function RichText({ text }: { text: string }) {
  const bold = (line: string): ReactNode[] =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
    )
  const blocks: ReactNode[] = []
  let list: string[] = []
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={`l${blocks.length}`}>
          {list.map((li, i) => (
            <li key={i}>{bold(li)}</li>
          ))}
        </ul>,
      )
      list = []
    }
  }
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    const item = line.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)$/)
    if (item) {
      list.push(item[1])
      continue
    }
    flush()
    if (line.trim()) blocks.push(<p key={`p${blocks.length}`}>{bold(line)}</p>)
  }
  flush()
  return <>{blocks}</>
}

export function TutorPanel({ question, chosen, onClose }: Props) {
  const context = questionContext(question, chosen)
  const [turns, setTurns] = useState<TutorTurn[]>([])
  const [streaming, setStreaming] = useState<string | null>(null)
  const [error, setError] = useState<TutorErrorKind | null>(null)
  const [draft, setDraft] = useState('')
  const [used, setUsed] = useState(tutorUsedToday)
  const ctl = useRef<AbortController | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const left = Math.max(0, TUTOR_LIMITS.dailyQuestions - used)
  const busy = streaming !== null

  async function send(message: string, history: TutorTurn[]) {
    const text = message.trim().slice(0, TUTOR_LIMITS.maxCharsPerTurn)
    if (!text || busy) return
    if (tutorUsedToday() >= TUTOR_LIMITS.dailyQuestions) {
      setUsed(tutorUsedToday())
      return
    }
    const next = [...history, { role: 'user' as const, content: text }]
    setTurns(next)
    setDraft('')
    setError(null)
    setStreaming('')
    countTutorQuestion()
    setUsed(tutorUsedToday())
    ctl.current = new AbortController()
    try {
      const answer = await askTutor(context, next, { onText: setStreaming, signal: ctl.current.signal })
      setTurns([...next, { role: 'assistant', content: answer }])
    } catch (e) {
      const err = e instanceof TutorError ? e : new TutorError('failed')
      if (err.partial && err.kind !== 'refused') setTurns([...next, { role: 'assistant', content: err.partial + ' …' }])
      if (err.kind !== 'cancelled') setError(err.kind)
    } finally {
      setStreaming(null)
    }
  }

  // Al abrir, el tutor explica la pregunta automáticamente (el alumno ya tocó el botón).
  // (El temporizador evita un envío doble en el modo estricto de React.)
  useEffect(() => {
    const t = setTimeout(() => void send(openingRequest(question, chosen), []), 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Al cerrar el tutor se detiene la respuesta en curso.
  useEffect(() => () => ctl.current?.abort(), [])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, streaming, error])

  const lastUser = [...turns].reverse().find((t) => t.role === 'user')
  const retry = () => {
    if (!lastUser) return
    const idx = turns.lastIndexOf(lastUser)
    void send(lastUser.content, turns.slice(0, idx))
  }

  return (
    <motion.div className="tutor-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="tutor"
        role="dialog"
        aria-label="Tutor IA"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="tutor-head">
          <span className="tutor-avatar" aria-hidden="true">
            <GraduationCap size={22} />
          </span>
          <div className="tutor-title">
            <strong>Profe IA</strong>
            <span>
              {question.course} · {question.topic}
            </span>
          </div>
          <motion.button whileTap={tap} className="icon-btn" onClick={onClose} aria-label="Cerrar tutor">
            <X size={22} />
          </motion.button>
        </header>

        <div className="tutor-list" ref={listRef}>
          <div className="tutor-q">
            <span className="tiny muted">Pregunta</span>
            <p>{question.statement}</p>
          </div>

          {turns.map((t, i) => (
            <motion.div
              key={i}
              className={`bubble ${t.role}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {t.role === 'assistant' ? <RichText text={t.content} /> : t.content}
            </motion.div>
          ))}

          {streaming !== null && (
            <div className="bubble assistant">
              {streaming ? (
                <RichText text={streaming} />
              ) : (
                <span className="typing" aria-label="El tutor está pensando">
                  <i />
                  <i />
                  <i />
                </span>
              )}
            </div>
          )}

          {error && (
            <div className="tutor-error" role="status">
              <p>{ERROR_COPY[error]}</p>
              {(error === 'failed' || error === 'busy') && lastUser && (
                <button className="btn btn-ghost" onClick={retry}>
                  Reintentar
                </button>
              )}
            </div>
          )}
        </div>

        <footer className="tutor-foot">
          <AnimatePresence initial={false}>
            {!busy && turns.length > 0 && left > 0 && error !== 'denied' && error !== 'unavailable' && (
              <motion.div className="quick" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                {QUICK_REPLIES.map((q) => (
                  <motion.button key={q} whileTap={tap} className="quick-chip" onClick={() => send(q, turns)}>
                    <Sparkles size={14} /> {q}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {left === 0 && !busy ? (
            <p className="tutor-limit">
              Usaste tus {TUTOR_LIMITS.dailyQuestions} consultas de hoy. Mañana tienes {TUTOR_LIMITS.dailyQuestions} más.
            </p>
          ) : (
            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault()
                void send(draft, turns)
              }}
            >
              <label htmlFor="tutor-input" className="sr-only">
                Escribe tu duda
              </label>
              <input
                id="tutor-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Escribe tu duda…"
                maxLength={TUTOR_LIMITS.maxCharsPerTurn}
                disabled={busy || error === 'denied' || error === 'unavailable'}
                autoComplete="off"
              />
              {busy ? (
                <motion.button type="button" whileTap={tap} className="send stop" onClick={() => ctl.current?.abort()} aria-label="Detener respuesta">
                  <Square size={16} fill="currentColor" />
                </motion.button>
              ) : (
                <motion.button type="submit" whileTap={tap} className="send" disabled={!draft.trim()} aria-label="Enviar">
                  <SendHorizontal size={20} />
                </motion.button>
              )}
            </form>
          )}
          <p className="tutor-fine">
            Te quedan {left} de {TUTOR_LIMITS.dailyQuestions} consultas hoy · El tutor puede equivocarse: compáralo con la explicación oficial.
          </p>
        </footer>
      </motion.div>
    </motion.div>
  )
}
