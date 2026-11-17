import { ArrowLeft, ArrowRight, ChartColumn, CircleCheck, CirclePlay, Cloud, CloudOff, Coins, Crown, MessageCircleQuestion, FileText, LogIn, PencilLine, Target, Timer, Trophy, UserRound } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { ExamConfig, Progress } from '../types'
import { isWeeklyOpen, nextWeeklyOpening, weakTopics, weekId } from '../lib/game'
import { CoinPill, CourseIcon, Screen, StreakPill } from '../ui'
import { TutorPanel } from '../components/TutorPanel'
import { itemVariants, listVariants, tap } from '../lib/ui-helpers'
import { useAuth } from '../lib/auth'
import { supabase, type Ranking } from '../lib/supabase'
import type { SyncState } from '../lib/storage'
import { DailyCard, MyDuels, QuickActions, ReviewCard } from './HomeExtras'
import type { Duel } from '../lib/duel'

type Props = {
  exam: ExamConfig
  progress: Progress
  demoMode: boolean
  onToggleDemo: () => void
  onPractice: () => void
  onPracticeTopic: (topic: string) => void
  onWeekly: () => void
  onChangeExam: () => void
  sync: SyncState
  needsAccountForWeekly: boolean
  onAccount: () => void
  onReview: () => void
  onDaily: () => void
  onStats: () => void
  onInvite: () => void
  onDuel: () => void
  onOpenDuel: (duel: Duel) => void
}

const SYNC_LABEL: Record<SyncState, string> = {
  local: 'Progreso guardado solo en este celular',
  loading: 'Cargando tu progreso…',
  synced: 'Progreso guardado en tu cuenta',
  saving: 'Guardando…',
  offline: 'Sin conexión: se guardará al volver internet',
}

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])
  const ms = Math.max(0, target.getTime() - now)
  const d = Math.floor(ms / 86_400_000)
  const h = Math.floor((ms % 86_400_000) / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return { d, h, m }
}

export function Home({ exam, progress, demoMode, onToggleDemo, onPractice, onPracticeTopic, onWeekly, onChangeExam, sync, needsAccountForWeekly, onAccount, onReview, onDaily, onStats, onInvite, onDuel, onOpenDuel }: Props) {
  const auth = useAuth()
  const open = demoMode || isWeeklyOpen()
  const alreadyDone = !demoMode && progress.weeklyResults.some((r) => r.weekId === weekId())
  const canPay = progress.coins >= exam.weekly.entryCost
  const weak = weakTopics(progress)
  const last = progress.weeklyResults[progress.weeklyResults.length - 1]
  const countdown = useCountdown(nextWeeklyOpening())
  const accuracy = (() => {
    const s = Object.values(progress.topicStats).reduce((a, t) => ({ c: a.c + t.correct, t: a.t + t.total }), { c: 0, t: 0 })
    return s.t ? Math.round((s.c / s.t) * 100) : null
  })()
  const coinPct = Math.min(100, (progress.coins / exam.weekly.entryCost) * 100)
  const courseOf = (topic: string) => exam.questions.find((q) => q.topic === topic)?.course ?? null

  // Puesto en vivo del último examen: el ranking cambia mientras otros alumnos dan el examen.
  const [live, setLive] = useState<{ position: number; participants: number } | null>(null)
  const lastWeek = last && !last.weekId.startsWith('demo-') ? last.weekId : null
  useEffect(() => {
    if (!supabase || !auth.userId || !lastWeek) return
    void supabase.rpc('weekly_ranking', { p_exam_id: exam.id, p_week_id: lastWeek }).then(({ data }) => {
      const r = data as Ranking | null
      if (r?.me) setLive({ position: r.me.position, participants: r.participants })
    })
  }, [auth.userId, exam.id, lastWeek])
  const [freeTutor, setFreeTutor] = useState(false)
  const courses = [...new Set(exam.questions.map((q) => q.course))]
  const lastPosition = live?.position ?? last?.position ?? 0
  const lastParticipants = live?.participants ?? last?.participants ?? 0

  return (
    <Screen className="home">
      <header className="topbar">
        <motion.button className="link" whileTap={tap} onClick={onChangeExam}>
          <ArrowLeft size={18} strokeWidth={2.6} /> {exam.name}
        </motion.button>
        <div className="pills">
          <CoinPill coins={progress.coins} />
          <StreakPill streak={progress.streak} />
          {auth.enabled && (
            <motion.button
              whileTap={tap}
              className={`pill account-btn ${auth.userId ? 'in' : ''}`}
              onClick={onAccount}
              aria-label={auth.userId ? 'Mi cuenta' : 'Iniciar sesión'}
            >
              {auth.userId ? <UserRound size={18} /> : <LogIn size={18} />}
            </motion.button>
          )}
        </div>
      </header>

      <motion.div className="stack home-grid" variants={listVariants} initial="hidden" animate="show">
        <motion.div variants={itemVariants} className="greeting">
          <h1>¡Hola, {auth.profile?.alias ?? 'postulante'}!</h1>
          <p className="muted">
            {progress.answered === 0
              ? 'Empieza con una práctica corta para ganar tus primeras monedas.'
              : `Llevas ${progress.answered} preguntas respondidas${accuracy !== null ? ` · ${accuracy}% de aciertos` : ''}.`}
          </p>
          {auth.enabled && (
            <p className={`sync-note ${sync}`}>
              {sync === 'offline' || sync === 'local' ? <CloudOff size={14} /> : <Cloud size={14} />}
              {SYNC_LABEL[sync]}
              {sync === 'local' && (
                <button className="link inline" onClick={onAccount}>
                  Crear cuenta
                </button>
              )}
            </p>
          )}
        </motion.div>

        <motion.section variants={itemVariants} className="event">
          <div className="event-glow" aria-hidden="true" />
          <div className="event-tag">EVENTO DE CADA DOMINGO</div>
          <h2 className="event-title">Examen de Admisión</h2>
          <div className="event-facts">
            <span><FileText size={15} /> {exam.weekly.questionCount} preguntas</span>
            <span><Timer size={15} /> {exam.weekly.minutes / 60} horas</span>
            <span><Trophy size={15} /> Ranking de Ica</span>
          </div>

          {alreadyDone ? (
            <p className="event-note with-icon"><CircleCheck size={18} /> Ya diste el examen de esta semana. ¡Nos vemos el próximo domingo!</p>
          ) : open && needsAccountForWeekly ? (
            <>
              <motion.button className="btn btn-gold" whileTap={tap} onClick={onWeekly}>
                <LogIn size={18} /> Crea tu cuenta para competir
              </motion.button>
              <p className="event-note">El ranking es entre alumnos con cuenta. Es gratis.</p>
            </>
          ) : open ? (
            <>
              <motion.button className="btn btn-gold" disabled={!canPay} whileTap={canPay ? tap : undefined} onClick={onWeekly}>
                Entrar por <span className="coin" aria-hidden="true" /> {exam.weekly.entryCost}
              </motion.button>
              {!canPay && (
                <div className="entry-progress">
                  <div className="entry-bar">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${coinPct}%` }} transition={{ duration: 0.8, delay: 0.3 }} />
                  </div>
                  <span>
                    Te faltan {exam.weekly.entryCost - progress.coins} monedas. ¡Practica para ganarlas!
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="countdown">
              <span className="event-note">Abre en</span>
              {[
                [countdown.d, 'días'],
                [countdown.h, 'horas'],
                [countdown.m, 'min'],
              ].map(([v, l]) => (
                <div key={l} className="cd-box">
                  <strong>{v}</strong>
                  <span>{l}</span>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        <motion.button variants={itemVariants} whileTap={tap} whileHover={{ y: -2 }} className="cta" onClick={onPractice}>
          <span className="cta-icon" aria-hidden="true"><PencilLine size={26} strokeWidth={2.4} /></span>
          <span className="cta-text">
            <strong>Practicar</strong>
            <span>Elige el curso y cuántas preguntas</span>
          </span>
          <span className="cta-arrow" aria-hidden="true"><ArrowRight size={24} strokeWidth={2.6} /></span>
        </motion.button>

        <DailyCard exam={exam} progress={progress} onStart={onDaily} />
        <ReviewCard exam={exam} progress={progress} onStart={onReview} />
        <QuickActions onStats={onStats} onDuel={onDuel} onInvite={onInvite} />

        <motion.button variants={itemVariants} whileTap={tap} whileHover={{ y: -2 }} className="card free-tutor-card" onClick={() => setFreeTutor(true)}>
          <span className="free-tutor-icon" aria-hidden="true">
            <MessageCircleQuestion size={26} />
          </span>
          <span className="free-tutor-text">
            <strong>
              Tutor libre <span className="premium-badge"><Crown size={12} /> Premium</span>
            </strong>
            <span>Pregúntale al tutor IA cualquier tema del examen</span>
          </span>
          <ArrowRight size={22} aria-hidden="true" />
        </motion.button>

        {weak.length > 0 && (
          <motion.section variants={itemVariants} className="card">
            <h3 className="h-icon"><Target size={20} /> Tus temas débiles</h3>
            <div className="stack-sm">
              {weak.map((t) => (
                <motion.button key={t.topic} whileTap={tap} className="row-btn" onClick={() => onPracticeTopic(t.topic)}>
                  <CourseIcon course={courseOf(t.topic)} size="sm" />
                  <span className="row-main">
                    <span>{t.topic}</span>
                    <span className="meter">
                      <motion.span initial={{ width: 0 }} animate={{ width: `${t.pct}%` }} transition={{ duration: 0.8 }} />
                    </span>
                  </span>
                  <span className="muted small">{t.pct}%</span>
                </motion.button>
              ))}
            </div>
          </motion.section>
        )}

        <MyDuels onOpen={onOpenDuel} />

        {last && (
          <motion.section variants={itemVariants} className="card last-exam">
            <h3 className="h-icon"><ChartColumn size={20} /> Tu último examen</h3>
            <div className="stat-row">
              <div>
                <strong>{last.score}</strong>
                <span>de {last.maxScore} pts</span>
              </div>
              <div>
                <strong>{lastPosition > 0 ? `#${lastPosition}` : '—'}</strong>
                <span>{lastPosition > 0 ? `de ${lastParticipants}${live ? ' · en vivo' : ''}` : 'puesto'}</span>
              </div>
              <div>
                <strong>
                  {last.correct}/{last.totalQuestions}
                </strong>
                <span>correctas</span>
              </div>
            </div>
          </motion.section>
        )}

        <motion.section variants={itemVariants} className="card">
          <h3 className="h-icon"><Coins size={20} /> Cómo ganar monedas</h3>
          <ul className="earn">
            <li><span>Respuesta correcta</span><b>+1</b></li>
            <li><span>Práctica con 70% o más</span><b>+5</b></li>
            <li><span>Racha diaria</span><b>+5</b></li>
            <li><span>Top 10 del domingo</span><b>+50</b></li>
            <li><span>Pregunta del día</span><b>+10</b></li>
            <li><span>Invitar a un amigo</span><b>+50</b></li>
          </ul>
          <button className="btn btn-ghost full" disabled>
            <CirclePlay size={18} /> Ver anuncio (+20) · disponible en la app de Android
          </button>
        </motion.section>

        <motion.section variants={itemVariants} className="card premium">
          <div className="premium-head">
            <h3 className="h-icon"><Crown size={20} /> Premium</h3>
            <span className="price">S/ 5<small>/mes</small></span>
          </div>
          <ul className="checks">
            <li>Entrada gratis al examen de cada domingo</li>
            <li>Tutor libre: pregunta cualquier tema del examen</li>
            <li>Tutor con IA: 10 consultas al día</li>
            <li>Reporte completo por tema y sin anuncios</li>
          </ul>
          <button className="btn btn-ghost full" disabled>Próximamente</button>
        </motion.section>

        <motion.label variants={itemVariants} className="demo-toggle small">
          <input id="demo-mode" type="checkbox" checked={demoMode} onChange={onToggleDemo} />
          Modo demo: abrir el examen del domingo en cualquier momento
        </motion.label>
      </motion.div>
      <AnimatePresence>
        {freeTutor && <TutorPanel key="free-tutor" free={{ examName: exam.name, courses }} onClose={() => setFreeTutor(false)} />}
      </AnimatePresence>
    </Screen>
  )
}
