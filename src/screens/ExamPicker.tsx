import { exams } from '../data/exams'

export function ExamPicker({ onPick }: { onPick: (id: string) => void }) {
  return (
    <div className="screen">
      <header className="hero">
        <div className="logo">🎓 IngresaYa</div>
        <p className="muted">Prepárate para tu examen de admisión jugando.</p>
      </header>

      <h2 className="section-title">¿Para qué examen te preparas?</h2>
      <div className="stack">
        {exams.map((exam) => (
          <button
            key={exam.id}
            className={`card exam-card ${exam.available ? '' : 'disabled'}`}
            disabled={!exam.available}
            onClick={() => onPick(exam.id)}
          >
            <div className="exam-name">{exam.name}</div>
            <div className="muted small">{exam.fullName}</div>
            {!exam.available && <span className="badge">Próximamente</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
