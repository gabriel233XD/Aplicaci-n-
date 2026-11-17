import { useState } from 'react'
import type { ShownQuestion } from '../types'

export type PracticeAnswer = { chosen: number; usedHint: boolean }

type Props = {
  questions: ShownQuestion[]
  onFinish: (answers: PracticeAnswer[]) => void
  onQuit: () => void
}

const LETTERS = ['A', 'B', 'C', 'D', 'E']

export function Practice({ questions, onFinish, onQuit }: Props) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<PracticeAnswer[]>([])
  const [chosen, setChosen] = useState<number | null>(null)
  const [showHint, setShowHint] = useState(false)

  const { question, order } = questions[index]
  const answered = chosen !== null
  const isCorrect = chosen === question.answer

  function choose(original: number) {
    if (answered) return
    setChosen(original)
  }

  function next() {
    const all = [...answers, { chosen: chosen!, usedHint: showHint }]
    if (index + 1 >= questions.length) {
      onFinish(all)
      return
    }
    setAnswers(all)
    setIndex(index + 1)
    setChosen(null)
    setShowHint(false)
  }

  return (
    <div className="screen">
      <header className="topbar">
        <button className="link" onClick={onQuit}>✕ Salir</button>
        <span className="muted small">
          {index + 1} / {questions.length}
        </span>
      </header>
      <div className="progress-bar">
        <div style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>

      <div className="muted small">
        {question.course} · {question.topic}
      </div>
      <h2 className="statement">{question.statement}</h2>

      <div className="stack-sm">
        {order.map((orig, pos) => {
          let cls = 'option'
          if (answered && orig === question.answer) cls += ' correct'
          else if (answered && orig === chosen) cls += ' wrong'
          return (
            <button key={orig} className={cls} onClick={() => choose(orig)} disabled={answered}>
              <span className="letter">{LETTERS[pos]}</span>
              {question.options[orig]}
            </button>
          )
        })}
      </div>

      {!answered && !showHint && (
        <button className="btn btn-ghost" onClick={() => setShowHint(true)}>
          💡 Ver pista (esta pregunta no dará moneda)
        </button>
      )}
      {showHint && !answered && <div className="card hint">💡 {question.hint}</div>}

      {answered && (
        <div className={`card feedback ${isCorrect ? 'ok' : 'bad'}`}>
          <strong>{isCorrect ? '¡Correcto! 🎉' : 'Incorrecto'}</strong>
          <p>{question.explanation}</p>
          <button className="btn btn-primary" onClick={next}>
            {index + 1 >= questions.length ? 'Ver resultados' : 'Siguiente →'}
          </button>
        </div>
      )}
    </div>
  )
}
