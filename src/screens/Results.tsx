import { CheckCircle2, Circle, GraduationCap, Minus, School, Target, TrendingDown, TrendingUp, Trophy } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { UNICA_CAREERS } from '../data/unica-careers'
import type { ShownQuestion, WeeklyResult } from '../types'
import { CoinBurst, CountUp, Ring, Screen } from '../ui'
import { itemVariants, listVariants, tap } from '../lib/ui-helpers'
import { Review } from './Review'

type Topic = { topic: string; correct: number; total: number }

function sessionTopics(questions: ShownQuestion[], chosen: (number | null)[]): Topic[] {
  const map = new Map<string, Topic>()
  questions.forEach(({ question }, i) => {
    const t = map.get(question.topic) ?? { topic: question.topic, correct: 0, total: 0 }
    t.total++
    if (chosen[i] === question.answer) t.correct++
    map.set(question.topic, t)
  })
  return [...map.values()].filter((t) => t.correct < t.total).sort((a, b) => a.correct / a.total - b.correct / b.total)
}

function WeakList({ topics }: { topics: Topic[] }) {
  return (
    <div className="stack-sm">
      {topics.map((t) => (
        <div key={t.topic} className="weak-row">
          <span>{t.topic}</span>
          <span className="meter">
            <motion.span initial={{ width: 0 }} animate={{ width: `${(t.correct / t.total) * 100}%` }} transition={{ duration: 0.8, delay: 0.3 }} />
          </span>
          <span className="muted small tabular">
            {t.correct}/{t.total}
          </span>
        </div>
      ))}
    </div>
  )
}

export type PracticeSummary = {
  correct: number
  total: number
  coinsCorrect: number
  passBonus: number
  streakBonus: number
  streak: number
  /** Monedas de la pregunta del día. */
  dailyBonus?: number
}

export function PracticeResult({
  summary,
  questions,
  chosen,
  onHome,
  onAgain,
  againLabel = 'Practicar otra vez',
}: {
  summary: PracticeSummary
  questions: ShownQuestion[]
  chosen: (number | null)[]
  onHome: () => void
  onAgain: () => void
  againLabel?: string
}) {
  const pct = Math.round((summary.correct / summary.total) * 100)
  const totalCoins = summary.coinsCorrect + summary.passBonus + summary.streakBonus + (summary.dailyBonus ?? 0)
  const weak = sessionTopics(questions, chosen).slice(0, 3)

  return (
    <Screen>
      <motion.div className="stack" variants={listVariants} initial="hidden" animate="show">
        <motion.section variants={itemVariants} className="card result-hero">
          {totalCoins > 0 && <CoinBurst count={Math.min(18, 6 + totalCoins)} />}
          <Ring pct={pct}>
            <strong className="ring-num">
              <CountUp value={pct} />%
            </strong>
            <span className="muted tiny">
              {summary.correct} de {summary.total}
            </span>
          </Ring>
          <h2>{pct >= 70 ? '¡Muy bien! Sigue así.' : pct >= 40 ? '¡Vas bien, sigue practicando!' : 'Cada error es una lección'}</h2>
          <div className="coins-earned">
            +<CountUp value={totalCoins} /> <span className="coin coin-lg" aria-hidden="true" />
          </div>
          <ul className="earn compact">
            <li><span>Respuestas correctas sin pista</span><b>+{summary.coinsCorrect}</b></li>
            {summary.passBonus > 0 && <li><span>Bonus por 70% o más</span><b>+{summary.passBonus}</b></li>}
            {summary.streakBonus > 0 && <li><span>Racha de {summary.streak} día(s)</span><b>+{summary.streakBonus}</b></li>}
            {!!summary.dailyBonus && <li><span>Pregunta del día{summary.correct ? ' (¡acertaste!)' : ' (por intentarlo)'}</span><b>+{summary.dailyBonus}</b></li>}
          </ul>
        </motion.section>

        {weak.length > 0 && (
          <motion.section variants={itemVariants} className="card">
            <h3 className="h-icon"><Target size={20} /> Repasa estos temas</h3>
            <WeakList topics={weak} />
          </motion.section>
        )}

        <motion.div variants={itemVariants}>
          <Review questions={questions} chosen={chosen} />
        </motion.div>

        <motion.div variants={itemVariants} className="nav-row">
          <motion.button whileTap={tap} className="btn btn-ghost" onClick={onHome}>Inicio</motion.button>
          <motion.button whileTap={tap} className="btn btn-primary" onClick={onAgain}>{againLabel}</motion.button>
        </motion.div>
      </motion.div>
    </Screen>
  )
}

export function WeeklyResultView({
  result,
  previous,
  bonus,
  questions,
  chosen,
  onHome,
  examId,
  onAddSchool,
}: {
  result: WeeklyResult
  previous: WeeklyResult | undefined
  bonus: number
  questions: ShownQuestion[]
  chosen: (number | null)[]
  onHome: () => void
  examId: string
  onAddSchool: () => void
}) {
  const weak = sessionTopics(questions, chosen).slice(0, 5)
  const diff = previous ? result.score - previous.score : null
  const topPct = result.participants ? Math.max(1, Math.round((result.position / result.participants) * 100)) : 0

  return (
    <Screen>
      <motion.div className="stack" variants={listVariants} initial="hidden" animate="show">
        <motion.section variants={itemVariants} className="event result-event">
          <div className="event-glow" aria-hidden="true" />
          {bonus > 0 && <CoinBurst count={18} />}
          <div className="event-tag">RESULTADO · EXAMEN DE ADMISIÓN</div>
          <div className="score">
            <CountUp value={result.score} duration={1.4} />
          </div>
          <div className="event-note">
            de {result.maxScore} puntos · {result.correct}/{result.totalQuestions} correctas
          </div>
          {result.rankingError ? (
            <p className="ranking-error">{result.rankingError}</p>
          ) : (
          <motion.div
            className="position-badge"
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.8 }}
          >
            <span>Puesto</span>
            <strong>#{result.position}</strong>
            <span>de {result.participants} · top {topPct}%</span>
          </motion.div>
          )}
          {diff !== null && (
            <div className={`trend ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}`}>
              {diff > 0 ? <TrendingUp size={18} /> : diff < 0 ? <TrendingDown size={18} /> : <Minus size={18} />}
              {diff > 0 ? `Subiste ${diff} puntos` : diff < 0 ? `Bajaste ${-diff} puntos` : 'Igual que la vez anterior'}
            </div>
          )}
          {bonus > 0 && <div className="coins-earned">¡Top 10! +{bonus} <span className="coin coin-lg" aria-hidden="true" /></div>}
          {result.simulated && <p className="event-fine">Ranking de ejemplo con postulantes simulados (modo demo o sin cuenta).</p>}
        </motion.section>

        {result.top && result.top.length > 0 && (
          <motion.section variants={itemVariants} className="card">
            <h3 className="h-icon"><Trophy size={20} /> Top 10 de Ica</h3>
            <ol className="leaderboard">
              {result.top.map((r) => (
                <li key={`${r.position}-${r.alias}`} className={r.isMe ? 'me' : ''}>
                  <span className={`lb-pos p${r.position}`}>{r.position}</span>
                  <span className="lb-alias">{r.alias}{r.isMe && ' (tú)'}</span>
                  <span className="lb-score tabular">{r.score}</span>
                </li>
              ))}
            </ol>
            {result.position > 10 && <p className="muted small">Tú estás en el puesto #{result.position}. ¡Sigue practicando para entrar al top!</p>}
          </motion.section>
        )}

        {examId === 'unica' && UNICA_CAREERS.length > 0 && result.totalQuestions > 0 && (
          <motion.section variants={itemVariants} className="card">
            <h3 className="h-icon"><GraduationCap size={20} /> ¿A qué carrera ingresarías?</h3>
            <p className="muted small">Con {Math.round((result.correct / result.totalQuestions) * 100)}% de aciertos, comparado con los puntajes mínimos de la UNICA ({UNICA_CAREERS[0].source}).</p>
            <ul className="careers">
              {[...UNICA_CAREERS]
                .sort((a, b) => b.minPercent - a.minPercent)
                .map((c) => {
                  const pct = (result.correct / result.totalQuestions) * 100
                  const ok = pct >= c.minPercent
                  return (
                    <li key={c.career} className={ok ? 'ok' : ''}>
                      {ok ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      <span>{c.career}</span>
                      <span className="muted small tabular">{ok ? 'Ingresarías' : `Te faltan ${Math.ceil(c.minPercent - pct)}%`}</span>
                    </li>
                  )
                })}
            </ul>
          </motion.section>
        )}

        {!result.simulated && !result.rankingError && <SchoolRanking examId={examId} weekId={result.weekId} onAddSchool={onAddSchool} />}

        {weak.length > 0 && (
          <motion.section variants={itemVariants} className="card">
            <h3 className="h-icon"><Target size={20} /> Practica esta semana</h3>
            <WeakList topics={weak} />
          </motion.section>
        )}

        <motion.div variants={itemVariants}>
          <Review questions={questions} chosen={chosen} />
        </motion.div>

        <motion.button variants={itemVariants} whileTap={tap} className="btn btn-primary big full" onClick={onHome}>
          Volver al inicio
        </motion.button>
      </motion.div>
    </Screen>
  )
}

type SchoolRow = { position: number; school: string; students: number; avgScore: number; best: number }

/** Ranking de colegios de la semana (promedio de sus alumnos). */
function SchoolRanking({ examId, weekId, onAddSchool }: { examId: string; weekId: string; onAddSchool: () => void }) {
  const auth = useAuth()
  const [data, setData] = useState<{ mine: string | null; top: SchoolRow[]; myPosition: number | null } | null>(null)
  const supported = auth.profile?.referralCode !== undefined // la migración 0004 está instalada

  useEffect(() => {
    if (!supabase || !supported) return
    void supabase.rpc('school_ranking', { p_exam_id: examId, p_week_id: weekId }).then(({ data }) => {
      if (data) setData(data as { mine: string | null; top: SchoolRow[]; myPosition: number | null })
    })
  }, [examId, weekId, supported])

  if (!supported) return null
  return (
    <motion.section variants={itemVariants} className="card">
      <h3 className="h-icon"><School size={20} /> Ranking de colegios</h3>
      {!auth.profile?.school ? (
        <div className="stack-sm">
          <p className="muted small">Agrega tu colegio para que tus puntajes sumen al ranking de colegios de Ica.</p>
          <motion.button whileTap={tap} className="btn btn-ghost full" onClick={onAddSchool}>
            <School size={18} /> Agregar mi colegio
          </motion.button>
        </div>
      ) : !data || data.top.length === 0 ? (
        <p className="muted small">Cargando el ranking de colegios…</p>
      ) : (
        <>
          <ol className="leaderboard">
            {data.top.map((r) => (
              <li key={r.school} className={r.school === data.mine ? 'me' : ''}>
                <span className={`lb-pos p${r.position}`}>{r.position}</span>
                <span className="lb-alias">
                  {r.school}
                  <span className="muted tiny"> · {r.students} {r.students === 1 ? 'alumno' : 'alumnos'}</span>
                </span>
                <span className="lb-score tabular">{r.avgScore}</span>
              </li>
            ))}
          </ol>
          <p className="muted small">
            Puntaje promedio de los alumnos de cada colegio esta semana.
            {data.myPosition && data.myPosition > 10 ? ` Tu colegio está en el puesto #${data.myPosition}.` : ''}
          </p>
        </>
      )}
    </motion.section>
  )
}
