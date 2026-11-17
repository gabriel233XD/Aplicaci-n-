import { motion } from 'framer-motion'
import { ArrowRight, Brain, CalendarDays, ChartLine, CheckCircle2, Gift, Swords } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ExamConfig, Progress } from '../types'
import { dayKey } from '../lib/game'
import { DAILY_REWARD, dailyQuestion, dueMistakes, pendingMistakes } from '../lib/learning'
import { itemVariants, tap } from '../lib/ui-helpers'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { CourseIcon } from '../ui'
import { duelOutcome, type Duel } from '../lib/duel'

/** Pregunta del día: la misma para todos, da monedas extra una vez al día. */
export function DailyCard({ exam, progress, onStart }: { exam: ExamConfig; progress: Progress; onStart: () => void }) {
  const today = dayKey()
  const done = progress.extra.daily?.day === today
  const q = dailyQuestion(exam, today)
  return (
    <motion.button
      variants={itemVariants}
      whileTap={done ? undefined : tap}
      className={`card daily-card ${done ? 'done' : ''}`}
      onClick={done ? undefined : onStart}
      disabled={done}
    >
      <span className="daily-icon" aria-hidden="true">
        {done ? <CheckCircle2 size={26} /> : <CalendarDays size={26} />}
      </span>
      <span className="daily-text">
        <strong>Pregunta del día</strong>
        {done ? (
          <span>{progress.extra.daily?.correct ? '¡Acertaste hoy! Vuelve mañana por otra.' : 'Ya la respondiste. Mañana hay otra.'}</span>
        ) : (
          <span className="daily-course">
            <CourseIcon course={q.course} size="sm" /> {q.course} · gana <b>+{DAILY_REWARD.correct}</b> monedas
          </span>
        )}
      </span>
      {!done && <ArrowRight size={22} aria-hidden="true" />}
    </motion.button>
  )
}

/** Repaso de errores: preguntas falladas que vuelven en 1, 3 y 7 días. */
export function ReviewCard({ exam, progress, onStart }: { exam: ExamConfig; progress: Progress; onStart: () => void }) {
  const due = dueMistakes(progress.extra, exam).length
  const pending = pendingMistakes(progress.extra)
  if (pending === 0) return null
  return (
    <motion.button
      variants={itemVariants}
      whileTap={due ? tap : undefined}
      className={`card review-card ${due ? '' : 'done'}`}
      onClick={due ? onStart : undefined}
      disabled={!due}
    >
      <span className="review-icon" aria-hidden="true">
        <Brain size={26} />
        {due > 0 && <span className="count-dot tabular">{due}</span>}
      </span>
      <span className="daily-text">
        <strong>Repasa tus errores</strong>
        <span>
          {due > 0
            ? `${due} ${due === 1 ? 'pregunta toca' : 'preguntas tocan'} hoy · repasar es la mejor forma de no volver a fallar`
            : `${pending} en repaso · vuelven en los próximos días`}
        </span>
      </span>
      {due > 0 && <ArrowRight size={22} aria-hidden="true" />}
    </motion.button>
  )
}

/** Accesos rápidos: Mi progreso, Duelo e Invitar. */
export function QuickActions({ onStats, onDuel, onInvite }: { onStats: () => void; onDuel: () => void; onInvite: () => void }) {
  const items = [
    { icon: ChartLine, label: 'Mi progreso', sub: 'Gráficos y logros', onClick: onStats },
    { icon: Swords, label: 'Duelo 1 vs 1', sub: 'Reta a un amigo', onClick: onDuel },
    { icon: Gift, label: 'Invitar', sub: '+50 monedas', onClick: onInvite },
  ]
  return (
    <motion.div variants={itemVariants} className="quick-actions">
      {items.map(({ icon: Icon, label, sub, onClick }) => (
        <motion.button key={label} whileTap={tap} className="quick-action" onClick={onClick}>
          <span className="qa-icon" aria-hidden="true">
            <Icon size={24} />
          </span>
          <strong>{label}</strong>
          <span>{sub}</span>
        </motion.button>
      ))}
    </motion.div>
  )
}

/** Últimos duelos del alumno (con cuenta). */
export function MyDuels({ onOpen }: { onOpen: (d: Duel) => void }) {
  const auth = useAuth()
  const [duels, setDuels] = useState<Duel[] | null>(null)
  useEffect(() => {
    if (!supabase || !auth.userId || auth.profile?.referralCode === undefined) return
    void supabase.rpc('my_duels').then(({ data }) => setDuels(Array.isArray(data) ? (data as Duel[]) : []))
  }, [auth.userId, auth.profile?.referralCode])
  if (!duels || duels.length === 0) return null

  const label = { win: 'Ganaste', lose: 'Perdiste', tie: 'Empate', waiting: 'Esperando rival' }
  return (
    <motion.section variants={itemVariants} className="card">
      <h3 className="h-icon">
        <Swords size={20} /> Mis duelos
      </h3>
      <div className="stack-sm">
        {duels.slice(0, 5).map((d) => {
          const o = duelOutcome(d)
          const rival = d.role === 'creator' ? d.opponent?.alias : d.creator.alias
          return (
            <motion.button key={d.id} whileTap={tap} className="row-btn" onClick={() => onOpen(d)}>
              <span className={`duel-tag ${o}`}>{label[o]}</span>
              <span className="row-main">vs {rival ?? '…'}</span>
              <ArrowRight size={18} aria-hidden="true" />
            </motion.button>
          )
        })}
      </div>
    </motion.section>
  )
}
