import { motion } from 'framer-motion'
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
}

export function PracticeResult({
  summary,
  questions,
  chosen,
  onHome,
  onAgain,
}: {
  summary: PracticeSummary
  questions: ShownQuestion[]
  chosen: (number | null)[]
  onHome: () => void
  onAgain: () => void
}) {
  const pct = Math.round((summary.correct / summary.total) * 100)
  const totalCoins = summary.coinsCorrect + summary.passBonus + summary.streakBonus
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
          <h2>{pct >= 70 ? '¡Muy bien! Sigue así.' : pct >= 40 ? '¡Vas bien, sigue practicando!' : 'Cada error es una lección 💪'}</h2>
          <div className="coins-earned">
            +<CountUp value={totalCoins} /> <span className="coin coin-lg" aria-hidden="true" />
          </div>
          <ul className="earn compact">
            <li><span>Respuestas correctas sin pista</span><b>+{summary.coinsCorrect}</b></li>
            {summary.passBonus > 0 && <li><span>Bonus por 70% o más</span><b>+{summary.passBonus}</b></li>}
            {summary.streakBonus > 0 && <li><span>Racha de {summary.streak} día(s) 🔥</span><b>+{summary.streakBonus}</b></li>}
          </ul>
        </motion.section>

        {weak.length > 0 && (
          <motion.section variants={itemVariants} className="card">
            <h3>🎯 Repasa estos temas</h3>
            <WeakList topics={weak} />
          </motion.section>
        )}

        <motion.div variants={itemVariants}>
          <Review questions={questions} chosen={chosen} />
        </motion.div>

        <motion.div variants={itemVariants} className="nav-row">
          <motion.button whileTap={tap} className="btn btn-ghost" onClick={onHome}>Inicio</motion.button>
          <motion.button whileTap={tap} className="btn btn-primary" onClick={onAgain}>Practicar otra vez</motion.button>
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
}: {
  result: WeeklyResult
  previous: WeeklyResult | undefined
  bonus: number
  questions: ShownQuestion[]
  chosen: (number | null)[]
  onHome: () => void
}) {
  const weak = sessionTopics(questions, chosen).slice(0, 5)
  const diff = previous ? result.score - previous.score : null
  const topPct = Math.max(1, Math.round((result.position / result.participants) * 100))

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
          {diff !== null && (
            <div className={`trend ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}`}>
              {diff > 0 ? `📈 Subiste ${diff} puntos` : diff < 0 ? `📉 Bajaste ${-diff} puntos` : '➖ Igual que la vez anterior'}
            </div>
          )}
          {bonus > 0 && <div className="coins-earned">¡Top 10! +{bonus} <span className="coin coin-lg" aria-hidden="true" /></div>}
          <p className="event-fine">Ranking de ejemplo con postulantes simulados (prototipo).</p>
        </motion.section>

        {weak.length > 0 && (
          <motion.section variants={itemVariants} className="card">
            <h3>🎯 Practica esta semana</h3>
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
