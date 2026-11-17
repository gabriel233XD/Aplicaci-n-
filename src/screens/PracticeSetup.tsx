import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import type { ExamConfig } from '../types'
import { PRACTICE_SIZES } from '../lib/game'
import { CourseIcon, Screen } from '../ui'
import { courseStyle, itemVariants, listVariants, tap } from '../lib/ui-helpers'

type Props = {
  exam: ExamConfig
  onStart: (course: string | null, count: number) => void
  onBack: () => void
}

const SIZE_LABEL: Record<number, string> = { 5: 'Rápido', 10: 'Normal', 20: 'Intenso', 50: 'Maratón' }

export function PracticeSetup({ exam, onStart, onBack }: Props) {
  const courses = [...new Set(exam.questions.map((q) => q.course))]
  const [course, setCourse] = useState<string | null>(null)
  const [count, setCount] = useState(10)
  const countFor = (c: string | null) => exam.questions.filter((q) => !c || q.course === c).length
  const available = countFor(course)

  return (
    <Screen>
      <header className="topbar">
        <motion.button className="link" whileTap={tap} onClick={onBack}><ArrowLeft size={18} strokeWidth={2.6} /> Volver</motion.button>
      </header>

      <h1 className="page-title">¿Qué quieres practicar?</h1>

      <motion.div className="course-grid" variants={listVariants} initial="hidden" animate="show">
        {[null, ...courses].map((c) => {
          const active = course === c
          return (
            <motion.button
              key={c ?? 'all'}
              variants={itemVariants}
              whileTap={tap}
              className={`course-card ${active ? 'active' : ''}`}
              style={courseStyle(c)}
              onClick={() => setCourse(c)}
            >
              {active && <motion.span layoutId="course-sel" className="course-sel" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
              <CourseIcon course={c} />
              <span className="course-name">{c ?? 'Todos los cursos'}</span>
              <span className="muted tiny">{countFor(c)} preguntas</span>
            </motion.button>
          )
        })}
      </motion.div>

      <h2 className="section-title">¿Cuántas preguntas?</h2>
      <div className="segmented">
        {PRACTICE_SIZES.map((n) => (
          <button key={n} className={`seg ${count === n ? 'active' : ''}`} onClick={() => setCount(n)}>
            {count === n && <motion.span layoutId="seg-sel" className="seg-sel" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
            <strong>{n}</strong>
            <span>{SIZE_LABEL[n]}</span>
          </button>
        ))}
      </div>
      {count > available && (
        <p className="muted small">Por ahora hay {available} preguntas de ejemplo en esta selección; se usarán todas.</p>
      )}

      <div className="sticky-cta">
        <motion.button whileTap={tap} className="btn btn-primary big full" onClick={() => onStart(course, Math.min(count, available))}>
          ¡Empezar!
        </motion.button>
      </div>
    </Screen>
  )
}
