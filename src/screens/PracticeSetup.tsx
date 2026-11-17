import { useState } from 'react'
import type { ExamConfig } from '../types'
import { PRACTICE_SIZES } from '../lib/game'

type Props = {
  exam: ExamConfig
  onStart: (course: string | null, count: number) => void
  onBack: () => void
}

export function PracticeSetup({ exam, onStart, onBack }: Props) {
  const courses = [...new Set(exam.questions.map((q) => q.course))]
  const [course, setCourse] = useState<string | null>(null)
  const available = exam.questions.filter((q) => !course || q.course === course).length
  const [count, setCount] = useState(10)

  return (
    <div className="screen">
      <header className="topbar">
        <button className="link" onClick={onBack}>← Volver</button>
      </header>
      <h2 className="section-title">¿Qué quieres practicar?</h2>

      <div className="chips">
        <button className={`chip ${course === null ? 'active' : ''}`} onClick={() => setCourse(null)}>
          Todos los cursos
        </button>
        {courses.map((c) => (
          <button key={c} className={`chip ${course === c ? 'active' : ''}`} onClick={() => setCourse(c)}>
            {c}
          </button>
        ))}
      </div>

      <h2 className="section-title">¿Cuántas preguntas?</h2>
      <div className="chips">
        {PRACTICE_SIZES.map((n) => (
          <button key={n} className={`chip big-chip ${count === n ? 'active' : ''}`} onClick={() => setCount(n)}>
            {n}
          </button>
        ))}
      </div>
      {count > available && (
        <p className="muted small">
          Por ahora hay {available} preguntas de ejemplo en esta selección; se usarán todas.
        </p>
      )}

      <button className="btn btn-primary big" onClick={() => onStart(course, Math.min(count, available))}>
        ¡Empezar!
      </button>
    </div>
  )
}
