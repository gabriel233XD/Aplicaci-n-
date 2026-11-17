import type { ShownQuestion, WeeklyResult } from '../types'
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
    <div className="screen">
      <section className="card center">
        <div className="big-emoji">{pct >= 70 ? '🎉' : '💪'}</div>
        <h2>
          {summary.correct} de {summary.total} correctas ({pct}%)
        </h2>
        <p className="muted">{pct >= 70 ? '¡Muy bien! Sigue así.' : 'Sigue practicando, ¡vas a mejorar!'}</p>
        <div className="coins-earned">+{totalCoins} 🪙</div>
        <ul className="small rules left">
          <li>Respuestas correctas sin pista: +{summary.coinsCorrect}</li>
          {summary.passBonus > 0 && <li>Bonus por 70% o más: +{summary.passBonus}</li>}
          {summary.streakBonus > 0 && <li>Racha de {summary.streak} día(s) 🔥: +{summary.streakBonus}</li>}
        </ul>
      </section>

      {weak.length > 0 && (
        <section className="card">
          <h3>🎯 Repasa estos temas</h3>
          <ul className="small rules">
            {weak.map((t) => (
              <li key={t.topic}>
                {t.topic}: {t.correct}/{t.total}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Review questions={questions} chosen={chosen} />

      <div className="nav-row">
        <button className="btn btn-ghost" onClick={onHome}>Inicio</button>
        <button className="btn btn-primary" onClick={onAgain}>Practicar otra vez</button>
      </div>
    </div>
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

  return (
    <div className="screen">
      <section className="card center event">
        <div className="event-tag">EXAMEN DE ADMISIÓN</div>
        <div className="score">{result.score}</div>
        <div>de {result.maxScore} puntos · {result.correct}/{result.totalQuestions} correctas</div>
        <div className="position">
          Puesto #{result.position} <span className="small">de {result.participants}</span>
        </div>
        {diff !== null && (
          <div className="small">
            {diff > 0 ? `📈 Subiste ${diff} puntos` : diff < 0 ? `📉 Bajaste ${-diff} puntos` : '➖ Igual que la vez anterior'}{' '}
            respecto a tu examen anterior
          </div>
        )}
        {bonus > 0 && <div className="coins-earned">¡Top 10! +{bonus} 🪙</div>}
        <p className="small muted-light">Ranking de ejemplo con postulantes simulados (prototipo).</p>
      </section>

      {weak.length > 0 && (
        <section className="card">
          <h3>🎯 Practica esta semana</h3>
          <ul className="small rules">
            {weak.map((t) => (
              <li key={t.topic}>
                {t.topic}: {t.correct}/{t.total}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Review questions={questions} chosen={chosen} />

      <button className="btn btn-primary big" onClick={onHome}>Volver al inicio</button>
    </div>
  )
}
