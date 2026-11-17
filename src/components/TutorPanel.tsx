import { AnimatePresence, motion } from 'framer-motion'
import { Crown, GraduationCap, LogIn, SendHorizontal, Sparkles, Square, X } from 'lucide-react'
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { TutorError, askTutor, countTutorQuestion, tutorMode, tutorUsedToday, type TutorErrorKind } from '../lib/tutor'
import { useAuth } from '../lib/auth'
import { accountsEnabled, supabase } from '../lib/supabase'
import { AuthSheet } from './AuthSheet'
import { FREE_STARTERS, QUICK_REPLIES, TUTOR_LIMITS, freeContext, openingRequest, questionContext, type TutorQuestion, type TutorTurn } from '../lib/tutorPrompt'
import { tap } from '../lib/ui-helpers'

type Props =
  | { question: TutorQuestion; chosen: number | null; onClose: () => void; free?: undefined }
  /** Tutor libre (Premium): el alumno pregunta cualquier tema del examen. */
  | { free: { examName: string; courses: string[] }; onClose: () => void; question?: undefined; chosen?: undefined }

const ERROR_COPY: Record<TutorErrorKind, string> = {
  unavailable: 'El tutor todavía no está activado en esta versión de la app.',
  denied: 'No se dio permiso para usar la IA. Puedes activarlo en el menú de permisos de la página.',
  busy: 'Hay muchas consultas en este momento. Espera un minuto y vuelve a intentarlo.',
  refused: 'El tutor no pudo responder eso. Prueba preguntando de otra forma.',
  failed: 'Se cortó la conexión con el tutor. Toca "Reintentar".',
  cancelled: '',
  login: 'Tu sesión se cerró. Vuelve a iniciar sesión para seguir usando el tutor.',
  limit: 'Ya usaste todas tus consultas de hoy. Mañana tienes más.',
  premium: 'El Tutor libre es una función Premium.',
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

export function TutorPanel({ question, chosen = null, free, onClose }: Props) {
  const context = question ? questionContext(question, chosen) : freeContext(free!.examName, free!.courses)
  const [turns, setTurns] = useState<TutorTurn[]>([])
  const [streaming, setStreaming] = useState<string | null>(null)
  const [error, setError] = useState<TutorErrorKind | null>(null)
  const [draft, setDraft] = useState('')
  const [used, setUsed] = useState(tutorUsedToday)
  const auth = useAuth()
  const [mode, setMode] = useState<'sample' | 'server' | null>(null)
  const [quota, setQuota] = useState<{ limit: number; used: number } | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const ctl = useRef<AbortController | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const opened = useRef(false)
  // Con cuentas activadas, el servidor lleva la cuenta de consultas; si no, se cuentan en el celular.
  const serverQuota = mode === 'server' && accountsEnabled
  const needsLogin = serverQuota && !auth.session
  const dailyLimit = serverQuota ? (quota?.limit ?? 0) : TUTOR_LIMITS.dailyQuestions
  const left = serverQuota ? (quota ? Math.max(0, quota.limit - quota.used) : 1) : Math.max(0, TUTOR_LIMITS.dailyQuestions - used)
  const busy = streaming !== null
  // Tutor libre: solo Premium cuando hay cuentas (sin cuentas, por ejemplo en la versión de prueba, queda abierto).
  const isPremium = !!auth.profile?.premium || (quota?.limit ?? 0) >= 10
  const locked = !!free && serverQuota && !!auth.session && quota !== null && !isPremium

  useEffect(() => {
    void tutorMode().then(setMode)
  }, [])

  // Consulta cuántas preguntas le quedan hoy al alumno (cuentas activadas).
  useEffect(() => {
    if (!serverQuota || !auth.session || !supabase) return
    void supabase.rpc('tutor_quota_status').then(({ data }) => {
      if (data) setQuota(data as { limit: number; used: number })
    })
  }, [serverQuota, auth.session])

  async function send(message: string, history: TutorTurn[]) {
    const text = message.trim().slice(0, TUTOR_LIMITS.maxCharsPerTurn)
    if (!text || busy) return
    if (needsLogin) return setShowLogin(true)
    if (locked) return
    if (!serverQuota && tutorUsedToday() >= TUTOR_LIMITS.dailyQuestions) {
      setUsed(tutorUsedToday())
      return
    }
    const next = [...history, { role: 'user' as const, content: text }]
    setTurns(next)
    setDraft('')
    setError(null)
    setStreaming('')
    if (!serverQuota) {
      countTutorQuestion()
      setUsed(tutorUsedToday())
    }
    ctl.current = new AbortController()
    try {
      const answer = await askTutor(context, next, {
        onText: setStreaming,
        signal: ctl.current.signal,
        token: auth.session?.access_token,
        free: !!free,
        onRemaining: (n) => setQuota((q) => (q ? { ...q, used: q.limit - n } : q)),
      })
      setTurns([...next, { role: 'assistant', content: answer }])
    } catch (e) {
      const err = e instanceof TutorError ? e : new TutorError('failed')
      if (err.partial && err.kind !== 'refused') setTurns([...next, { role: 'assistant', content: err.partial + ' …' }])
      if (err.kind === 'limit') setQuota((q) => (q ? { ...q, used: q.limit } : q))
      if (err.kind !== 'cancelled') setError(err.kind)
    } finally {
      setStreaming(null)
    }
  }

  // Al abrir, el tutor explica la pregunta automáticamente (el alumno ya tocó el botón).
  // (El temporizador evita un envío doble en el modo estricto de React.)
  // Espera a saber si se usa la IA del visor o el servidor, y a que haya sesión si hace falta.
  const ready = mode !== null && !needsLogin && (!serverQuota || quota !== null)
  useEffect(() => {
    if (!ready || opened.current) return
    const t = setTimeout(() => {
      opened.current = true
      if (serverQuota && quota && quota.used >= quota.limit) return setError('limit')
      // En el Tutor libre el alumno escribe primero.
      if (question) void send(openingRequest(question, chosen), [])
    }, 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

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
            <strong>{free ? 'Tutor libre' : 'Profe IA'}</strong>
            <span>{question ? `${question.course} · ${question.topic}` : `Pregúntame cualquier tema del examen ${free!.examName}`}</span>
          </div>
          <motion.button whileTap={tap} className="icon-btn" onClick={onClose} aria-label="Cerrar tutor">
            <X size={22} />
          </motion.button>
        </header>

        <div className="tutor-list" ref={listRef}>
          {question ? (
            <div className="tutor-q">
              <span className="tiny muted">Pregunta</span>
              <p>{question.statement}</p>
            </div>
          ) : (
            <div className="bubble assistant">
              <p>
                ¡Hola! Soy tu <strong>Tutor libre</strong>. Pregúntame cualquier tema del examen: te lo explico desde lo básico, con
                ejemplos, y si quieres te doy preguntas para practicar.
              </p>
            </div>
          )}

          {locked && (
            <div className="tutor-login premium-lock">
              <p className="with-icon">
                <Crown size={20} /> <strong>El Tutor libre es una función Premium.</strong>
              </p>
              <p>
                Con Premium (S/ 5 al mes) puedes preguntar cualquier tema del examen, sin partir de una pregunta, y tienes 10 consultas
                al día. Mientras tanto, usa el tutor después de responder cada pregunta en la práctica.
              </p>
            </div>
          )}

          {free && !locked && !needsLogin && turns.length === 0 && !busy && (
            <div className="starters">
              {FREE_STARTERS.map((q) => (
                <motion.button key={q} whileTap={tap} className="quick-chip" onClick={() => send(q, [])}>
                  <Sparkles size={14} /> {q}
                </motion.button>
              ))}
            </div>
          )}

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

          {needsLogin && (
            <div className="tutor-login">
              <p>
                <strong>Crea tu cuenta gratis</strong> para usar el tutor. Con la cuenta tienes 3 consultas al día y tu progreso se guarda aunque cambies de celular.
              </p>
              <motion.button whileTap={tap} className="btn btn-primary full" onClick={() => setShowLogin(true)}>
                <LogIn size={18} /> Crear cuenta o iniciar sesión
              </motion.button>
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
            {!busy && turns.length > 0 && left > 0 && !needsLogin && !locked && error !== 'denied' && error !== 'unavailable' && error !== 'limit' && error !== 'premium' && (
              <motion.div className="quick" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                {QUICK_REPLIES.map((q) => (
                  <motion.button key={q} whileTap={tap} className="quick-chip" onClick={() => send(q, turns)}>
                    <Sparkles size={14} /> {q}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {(left === 0 || error === 'limit') && !busy ? (
            <p className="tutor-limit">
              Usaste tus {dailyLimit} consultas de hoy. Mañana tienes {dailyLimit} más.
              {serverQuota && dailyLimit < 10 && ' Con Premium tendrás 10 al día.'}
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
                placeholder={free ? 'Pregunta cualquier tema…' : 'Escribe tu duda…'}
                maxLength={TUTOR_LIMITS.maxCharsPerTurn}
                disabled={busy || needsLogin || locked || error === 'denied' || error === 'unavailable' || error === 'premium'}
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
            {(!serverQuota || quota) && !needsLogin && !locked && `Te quedan ${left} de ${dailyLimit} consultas hoy · `}
            {free ? 'El tutor puede equivocarse: compáralo con tus apuntes.' : 'El tutor puede equivocarse: compáralo con la explicación oficial.'}
          </p>
        </footer>
      </motion.div>

      <AnimatePresence>
        {showLogin && <AuthSheet reason="Crea tu cuenta para usar el tutor IA y guardar tu progreso." onClose={() => setShowLogin(false)} />}
      </AnimatePresence>
    </motion.div>
  )
}
