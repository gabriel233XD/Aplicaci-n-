import { motion } from 'framer-motion'
import {
  ArrowLeft, Brain, CalendarCheck, Flame, FlameKindling, Footprints, Lock, Medal, Mountain, Sparkles, Swords, Target, Trophy, Users,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import type { ExamConfig, Progress } from '../types'
import { ACHIEVEMENTS, courseAccuracy, dailySeries, pendingMistakes } from '../lib/learning'
import { CourseIcon, Screen } from '../ui'
import { itemVariants, listVariants, tap } from '../lib/ui-helpers'

const ICONS: Record<string, LucideIcon> = {
  footprints: Footprints, target: Target, mountain: Mountain, flame: Flame, 'flame-kindling': FlameKindling, trophy: Trophy,
  sparkles: Sparkles, 'calendar-check': CalendarCheck, medal: Medal, brain: Brain, swords: Swords, users: Users,
}

const WEEKDAY = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

function DailyChart({ progress }: { progress: Progress }) {
  const series = dailySeries(progress.extra, 14)
  const max = Math.max(5, ...series.map((d) => d.answered))
  const [active, setActive] = useState<number | null>(null)
  const total = series.reduce((s, d) => s + d.answered, 0)
  const H = 120
  const shown = active ?? series.length - 1
  const sel = series[shown]
  const [y, m, d] = sel.day.split('-').map(Number)
  const date = new Date(y, m - 1, d)

  return (
    <div className="chart">
      <div className="chart-readout" aria-live="polite">
        <strong className="tabular">{sel.answered}</strong> preguntas ·{' '}
        {sel.answered ? `${Math.round((sel.correct / sel.answered) * 100)}% de aciertos` : 'sin práctica'}
        <span className="muted"> · {date.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
      </div>
      <div className="bars" style={{ height: H }} role="img" aria-label={`Preguntas respondidas por día en las últimas 2 semanas: ${total} en total`}>
        {[0.5, 1].map((f) => (
          <div key={f} className="gridline" style={{ bottom: f * H }}>
            <span className="tabular">{Math.round(max * f)}</span>
          </div>
        ))}
        {series.map((day, i) => (
          <button
            key={day.day}
            className={`bar-hit ${i === shown ? 'on' : ''}`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
            aria-label={`${day.day}: ${day.answered} preguntas`}
          >
            <motion.span
              className="bar"
              initial={{ height: 0 }}
              animate={{ height: day.answered ? Math.max(4, (day.answered / max) * H) : 0 }}
              transition={{ duration: 0.6, delay: i * 0.03 }}
            />
          </button>
        ))}
      </div>
      <div className="bar-labels" aria-hidden="true">
        {series.map((day) => {
          const [yy, mm, dd] = day.day.split('-').map(Number)
          return <span key={day.day}>{WEEKDAY[new Date(yy, mm - 1, dd).getDay()]}</span>
        })}
      </div>
    </div>
  )
}

export function Stats({ exam, progress, onBack }: { exam: ExamConfig; progress: Progress; onBack: () => void }) {
  const courses = courseAccuracy(progress.extra)
  const unlocked = progress.extra.achievements ?? {}
  const totalStats = Object.values(progress.topicStats).reduce((a, t) => ({ c: a.c + t.correct, t: a.t + t.total }), { c: 0, t: 0 })
  const accuracy = totalStats.t ? Math.round((totalStats.c / totalStats.t) * 100) : 0
  const nUnlocked = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length

  return (
    <Screen>
      <header className="topbar">
        <motion.button className="link" whileTap={tap} onClick={onBack}>
          <ArrowLeft size={18} strokeWidth={2.6} /> Volver
        </motion.button>
        <span className="muted small">{exam.name}</span>
      </header>
      <h1 className="page-title">Mi progreso</h1>

      <motion.div className="stack" variants={listVariants} initial="hidden" animate="show">
        <motion.div variants={itemVariants} className="stat-row tiles">
          <div>
            <strong className="tabular">{progress.answered}</strong>
            <span>preguntas</span>
          </div>
          <div>
            <strong className="tabular">{accuracy}%</strong>
            <span>aciertos</span>
          </div>
          <div>
            <strong className="tabular">{progress.extra.mastered ?? 0}</strong>
            <span>errores superados</span>
          </div>
        </motion.div>

        <motion.section variants={itemVariants} className="card">
          <h3>Preguntas por día</h3>
          <p className="muted small">Últimas 2 semanas. Toca una barra para ver el detalle.</p>
          <DailyChart progress={progress} />
        </motion.section>

        <motion.section variants={itemVariants} className="card">
          <h3>Aciertos por curso</h3>
          {courses.length === 0 ? (
            <p className="muted small">Practica un poco y aquí verás en qué cursos te va mejor.</p>
          ) : (
            <div className="course-bars">
              {courses.map((c) => (
                <div key={c.course} className="course-bar">
                  <CourseIcon course={c.course} size="sm" />
                  <div className="course-bar-main">
                    <div className="course-bar-head">
                      <span>{c.course}</span>
                      <span className="tabular">
                        {c.pct}% <span className="muted">· {c.correct}/{c.answered}</span>
                      </span>
                    </div>
                    <div className="meter thick">
                      <motion.span initial={{ width: 0 }} animate={{ width: `${c.pct}%` }} transition={{ duration: 0.8 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {pendingMistakes(progress.extra) > 0 && (
            <p className="muted small">Tienes {pendingMistakes(progress.extra)} preguntas en tu repaso de errores.</p>
          )}
        </motion.section>

        <motion.section variants={itemVariants} className="card">
          <div className="review-head">
            <h3>Logros</h3>
            <span className="muted small tabular">
              {nUnlocked} de {ACHIEVEMENTS.length}
            </span>
          </div>
          <div className="badges">
            {ACHIEVEMENTS.map((a) => {
              const Icon = ICONS[a.icon] ?? Trophy
              const date = unlocked[a.id]
              return (
                <div key={a.id} className={`badge-card ${date ? 'on' : ''}`}>
                  <span className="badge-icon" aria-hidden="true">
                    {date ? <Icon size={24} /> : <Lock size={20} />}
                  </span>
                  <strong>{a.name}</strong>
                  <span>{a.description}</span>
                </div>
              )
            })}
          </div>
        </motion.section>
      </motion.div>
    </Screen>
  )
}
