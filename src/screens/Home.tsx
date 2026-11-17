import type { ExamConfig, Progress } from '../types'
import { isWeeklyOpen, nextWeeklyOpening, weakTopics, weekId } from '../lib/game'

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

export function Home({ exam, progress, demoMode, onToggleDemo, onPractice, onPracticeTopic, onWeekly, onChangeExam }: Props) {
  const open = demoMode || isWeeklyOpen()
  const alreadyDone = !demoMode && progress.weeklyResults.some((r) => r.weekId === weekId())
  const canPay = progress.coins >= exam.weekly.entryCost
  const weak = weakTopics(progress)
  const last = progress.weeklyResults[progress.weeklyResults.length - 1]
  const next = nextWeeklyOpening()

  return (
    <div className="screen">
      <header className="topbar">
        <button className="link" onClick={onChangeExam}>← {exam.name}</button>
        <div className="pills">
          <span className="pill" title="Monedas">🪙 {progress.coins}</span>
          <span className="pill" title="Racha de días">🔥 {progress.streak}</span>
        </div>
      </header>

      <section className="card event">
        <div className="event-tag">EVENTO SEMANAL</div>
        <h2>🏆 Examen de Admisión</h2>
        <p className="small">
          {exam.weekly.questionCount} preguntas · {exam.weekly.minutes / 60} horas · ranking de Ica
        </p>
        {alreadyDone ? (
          <p className="small">✅ Ya diste el examen de esta semana. ¡Nos vemos el próximo domingo!</p>
        ) : open ? (
          <>
            <button className="btn btn-light" disabled={!canPay} onClick={onWeekly}>
              Entrar por 🪙 {exam.weekly.entryCost}
            </button>
            {!canPay && (
              <p className="small">
                Te faltan {exam.weekly.entryCost - progress.coins} monedas. ¡Practica para ganarlas!
              </p>
            )}
          </>
        ) : (
          <p className="small">
            Abre el domingo de 8:00 a. m. a 8:00 p. m.
            <br />
            Próximo: {next.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        )}
      </section>

      <button className="btn btn-primary big" onClick={onPractice}>
        ✏️ Practicar
        <span className="small block">Elige el curso y cuántas preguntas</span>
      </button>

      {weak.length > 0 && (
        <section className="card">
          <h3>🎯 Tus temas débiles</h3>
          <div className="stack-sm">
            {weak.map((t) => (
              <button key={t.topic} className="row-btn" onClick={() => onPracticeTopic(t.topic)}>
                <span>{t.topic}</span>
                <span className="muted small">{t.pct}% · practicar →</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {last && (
        <section className="card">
          <h3>📊 Tu último examen</h3>
          <p>
            <strong>{last.score}</strong> / {last.maxScore} puntos · puesto <strong>#{last.position}</strong> de{' '}
            {last.participants}
          </p>
        </section>
      )}

      <section className="card">
        <h3>🪙 Cómo ganar monedas</h3>
        <ul className="small rules">
          <li>Respuesta correcta: +1</li>
          <li>Terminar una práctica con 70% o más: +5</li>
          <li>Practicar todos los días (racha): +5 por día</li>
          <li>Quedar en el Top 10 del domingo: +50</li>
        </ul>
        <button className="btn btn-ghost" disabled>
          🎬 Ver anuncio (+20) · disponible en la app de Android
        </button>
      </section>

      <section className="card premium">
        <h3>⭐ Premium · S/ 5 al mes</h3>
        <ul className="small rules">
          <li>Entrada gratis al examen de cada domingo</li>
          <li>Tutor con IA que te explica donde fallas</li>
          <li>Reporte completo por tema · sin anuncios</li>
        </ul>
        <button className="btn btn-ghost" disabled>Próximamente</button>
      </section>

      <label className="demo-toggle small">
        <input type="checkbox" checked={demoMode} onChange={onToggleDemo} />
        Modo demo: abrir el examen del domingo en cualquier momento
      </label>
    </div>
  )
}
