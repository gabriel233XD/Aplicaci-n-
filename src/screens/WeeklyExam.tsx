import { useEffect, useRef, useState } from 'react'
import type { ShownQuestion } from '../types'

type Props = {
  questions: ShownQuestion[]
  minutes: number
  onFinish: (answers: (number | null)[]) => void
}

const LETTERS = ['A', 'B', 'C', 'D', 'E']

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function WeeklyExam({ questions, minutes, onFinish }: Props) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null))
  const [index, setIndex] = useState(0)
  const [showGrid, setShowGrid] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const endAt = useRef(Date.now() + minutes * 60_000)
  const [left, setLeft] = useState(minutes * 60)
  const answersRef = useRef(answers)
  answersRef.current = answers
  const finished = useRef(false)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  useEffect(() => {
    const id = setInterval(() => {
      const sec = Math.max(0, Math.round((endAt.current - Date.now()) / 1000))
      setLeft(sec)
      if (sec === 0 && !finished.current) {
        finished.current = true
        onFinishRef.current(answersRef.current)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const { question, order } = questions[index]
  const answeredCount = answers.filter((a) => a !== null).length

  function choose(orig: number) {
    setAnswers((prev) => prev.map((a, i) => (i === index ? orig : a)))
  }

  const missing = questions.length - answeredCount

  function finish() {
    if (finished.current) return
    finished.current = true
    onFinish(answers)
  }

  return (
    <div className="screen">
      <header className="topbar exam-bar">
        <span className={`timer ${left < 600 ? 'urgent' : ''}`}>⏱ {formatTime(left)}</span>
        <button className="link" onClick={() => setShowGrid(!showGrid)}>
          {answeredCount}/{questions.length} ▦
        </button>
      </header>

      {showGrid && (
        <div className="grid">
          {questions.map((_, i) => (
            <button
              key={i}
              className={`cell ${answers[i] !== null ? 'done' : ''} ${i === index ? 'current' : ''}`}
              onClick={() => {
                setIndex(i)
                setShowGrid(false)
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      <div className="muted small">
        Pregunta {index + 1} · {question.course}
      </div>
      <h2 className="statement">{question.statement}</h2>

      <div className="stack-sm">
        {order.map((orig, pos) => (
          <button
            key={orig}
            className={`option ${answers[index] === orig ? 'selected' : ''}`}
            onClick={() => choose(orig)}
          >
            <span className="letter">{LETTERS[pos]}</span>
            {question.options[orig]}
          </button>
        ))}
      </div>

      <div className="nav-row">
        <button className="btn btn-ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          ← Anterior
        </button>
        {index + 1 < questions.length ? (
          <button className="btn btn-primary" onClick={() => setIndex(index + 1)}>
            Siguiente →
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => setConfirming(true)}>
            Terminar
          </button>
        )}
      </div>
      {confirming ? (
        <div className="card confirm-box">
          <strong>
            {missing > 0 ? `Te faltan ${missing} preguntas. ¿Entregar el examen igual?` : '¿Entregar el examen?'}
          </strong>
          <div className="nav-row">
            <button className="btn btn-ghost" onClick={() => setConfirming(false)}>Seguir respondiendo</button>
            <button className="btn btn-primary" onClick={finish}>Sí, entregar</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-ghost" onClick={() => setConfirming(true)}>
          Entregar examen
        </button>
      )}
    </div>
  )
}
