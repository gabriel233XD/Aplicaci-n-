import { useState } from 'react'
import type { ShownQuestion } from '../types'

/** Lista de preguntas con la respuesta del alumno, la correcta y la explicación. */
export function Review({ questions, chosen }: { questions: ShownQuestion[]; chosen: (number | null)[] }) {
  const [onlyWrong, setOnlyWrong] = useState(true)
  const items = questions
    .map((sq, i) => ({ ...sq, chosen: chosen[i], n: i + 1 }))
    .filter((it) => !onlyWrong || it.chosen !== it.question.answer)

  return (
    <section className="card">
      <div className="review-head">
        <h3>📖 Revisión</h3>
        <label className="small">
          <input type="checkbox" checked={onlyWrong} onChange={() => setOnlyWrong(!onlyWrong)} /> Solo errores
        </label>
      </div>
      {items.length === 0 && <p className="muted small">¡No tuviste errores! 🎉</p>}
      <div className="stack-sm">
        {items.map(({ question, chosen: c, n }) => (
          <details key={question.id} className="review-item">
            <summary>
              {c === question.answer ? '✅' : '❌'} {n}. {question.statement}
            </summary>
            <p className="small">
              Tu respuesta: <strong>{c === null ? 'Sin responder' : question.options[c]}</strong>
              <br />
              Correcta: <strong>{question.options[question.answer]}</strong>
            </p>
            <p className="small">{question.explanation}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
