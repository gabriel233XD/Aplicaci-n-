import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { ExamConfig, Progress } from '../types'
import { isWeeklyOpen, nextWeeklyOpening, weakTopics, weekId } from '../lib/game'
import { CoinPill, CourseIcon, Screen, StreakPill } from '../ui'
import { itemVariants, listVariants, tap } from '../lib/ui-helpers'

type Props = {
  exam: ExamConfig
  progress: Progress
  demoMode: boolean
  onToggleDemo: () => void
  onPractice: () => void
  onPracticeTopic: (topic: string) => void
  onWeekly: () => void
  onChangeExam: () => void
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

export function Home({ exam, progress, demoMode, onToggleDemo, onPractice, onPracticeTopic, onWeekly, onChangeExam }: Props) {
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

  return (
    <Screen>
      <header className="topbar">
        <motion.button className="link" whileTap={tap} onClick={onChangeExam}>
          ← {exam.name}
        </motion.button>
        <div className="pills">
          <CoinPill coins={progress.coins} />
          <StreakPill streak={progress.streak} />
        </div>
      </header>

      <motion.div className="stack" variants={listVariants} initial="hidden" animate="show">
        <motion.div variants={itemVariants} className="greeting">
          <h1>¡Hola, postulante! 👋</h1>
          <p className="muted">
            {progress.answered === 0
              ? 'Empieza con una práctica corta para ganar tus primeras monedas.'
              : `Llevas ${progress.answered} preguntas respondidas${accuracy !== null ? ` · ${accuracy}% de aciertos` : ''}.`}
          </p>
        </motion.div>

        <motion.section variants={itemVariants} className="event">
          <div className="event-glow" aria-hidden="true" />
          <div className="event-tag">EVENTO DE CADA DOMINGO</div>
          <h2 className="event-title">Examen de Admisión</h2>
          <div className="event-facts">
            <span>📝 {exam.weekly.questionCount} preguntas</span>
            <span>⏱ {exam.weekly.minutes / 60} horas</span>
            <span>🏆 Ranking de Ica</span>
          </div>

          {alreadyDone ? (
            <p className="event-note">✅ Ya diste el examen de esta semana. ¡Nos vemos el próximo domingo!</p>
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
          <span className="cta-icon" aria-hidden="true">✏️</span>
          <span className="cta-text">
            <strong>Practicar</strong>
            <span>Elige el curso y cuántas preguntas</span>
          </span>
          <span className="cta-arrow" aria-hidden="true">→</span>
        </motion.button>

        {weak.length > 0 && (
          <motion.section variants={itemVariants} className="card">
            <h3>🎯 Tus temas débiles</h3>
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

        {last && (
          <motion.section variants={itemVariants} className="card last-exam">
            <h3>📊 Tu último examen</h3>
            <div className="stat-row">
              <div>
                <strong>{last.score}</strong>
                <span>de {last.maxScore} pts</span>
              </div>
              <div>
                <strong>#{last.position}</strong>
                <span>de {last.participants}</span>
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
          <h3>Cómo ganar monedas</h3>
          <ul className="earn">
            <li><span>Respuesta correcta</span><b>+1</b></li>
            <li><span>Práctica con 70% o más</span><b>+5</b></li>
            <li><span>Racha diaria 🔥</span><b>+5</b></li>
            <li><span>Top 10 del domingo</span><b>+50</b></li>
          </ul>
          <button className="btn btn-ghost full" disabled>
            🎬 Ver anuncio (+20) · disponible en la app de Android
          </button>
        </motion.section>

        <motion.section variants={itemVariants} className="card premium">
          <div className="premium-head">
            <h3>⭐ Premium</h3>
            <span className="price">S/ 5<small>/mes</small></span>
          </div>
          <ul className="checks">
            <li>Entrada gratis al examen de cada domingo</li>
            <li>Tutor con IA que te explica donde fallas</li>
            <li>Reporte completo por tema y sin anuncios</li>
          </ul>
          <button className="btn btn-ghost full" disabled>Próximamente</button>
        </motion.section>

        <motion.label variants={itemVariants} className="demo-toggle small">
          <input id="demo-mode" type="checkbox" checked={demoMode} onChange={onToggleDemo} />
          Modo demo: abrir el examen del domingo en cualquier momento
        </motion.label>
      </motion.div>
    </Screen>
  )
}
