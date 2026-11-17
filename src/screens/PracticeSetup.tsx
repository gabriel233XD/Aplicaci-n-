import { ArrowLeft, ArrowRight, ClipboardList } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import type { Area, ExamConfig } from '../types'
import { PRACTICE_SIZES } from '../lib/game'
import { CourseIcon, Screen } from '../ui'
import { courseStyle, itemVariants, listVariants, tap } from '../lib/ui-helpers'
import { MINI_SIMULACRO, weightedCourses } from '../lib/areas'

type Props = {
  exam: ExamConfig
  area: Area | null
  onStart: (course: string | null, count: number) => void
  onSimulacro: () => void
  onChangeArea: () => void
  onBack: () => void
}

const SIZE_LABEL: Record<number, string> = { 5: 'Rápido', 10: 'Normal', 20: 'Intenso', 50: 'Maratón' }

export function PracticeSetup({ exam, area, onStart, onSimulacro, onChangeArea, onBack }: Props) {
  const allCourses = [...new Set(exam.questions.map((q) => q.course))]
  const weighted = area ? weightedCourses(area).filter((w) => allCourses.includes(w.course)) : []
  const weightOf = new Map(weighted.map((w) => [w.course, w.count]))
  const others = allCourses.filter((c) => !weightOf.has(c))
  const [course, setCourse] = useState<string | null>(null)
  const [count, setCount] = useState(10)
  const countFor = (c: string | null) => exam.questions.filter((q) => !c || q.course === c).length
  const available = countFor(course)

  function renderGrid(list: (string | null)[]) {
    return (
      <motion.div className="course-grid" variants={listVariants} initial="hidden" animate="show">
        {list.map((c) => {
          const active = course === c
          const weight = c ? weightOf.get(c) : undefined
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
              {weight !== undefined && <span className="weight-tag">{weight} en tu examen</span>}
              <span className="muted tiny">{countFor(c)} para practicar</span>
            </motion.button>
          )
        })}
      </motion.div>
    )
  }

  return (
    <Screen>
      <header className="topbar">
        <motion.button className="link" whileTap={tap} onClick={onBack}><ArrowLeft size={18} strokeWidth={2.6} /> Volver</motion.button>
      </header>

      <h1 className="page-title">¿Qué quieres practicar?</h1>

      {area && (
        <motion.button whileTap={tap} className="area-chip" onClick={onChangeArea}>
          Área {area.id} · {area.name} <span>Cambiar</span>
        </motion.button>
      )}

      {area?.distribution && (
        <motion.button whileTap={tap} className="card simulacro-card" onClick={onSimulacro}>
          <span className="daily-icon" aria-hidden="true">
            <ClipboardList size={26} />
          </span>
          <span className="daily-text">
            <strong>Mini simulacro de mi área</strong>
            <span>{MINI_SIMULACRO} preguntas repartidas como en el examen real</span>
          </span>
          <ArrowRight size={22} aria-hidden="true" />
        </motion.button>
      )}
      {area && !area.distribution && (
        <p className="provisional-note">
          Aún no tenemos el examen real del Área {area.id}: por ahora ves todos los cursos. Pronto los ordenaremos según lo que más pesa en tu examen.
        </p>
      )}

      {weighted.length > 0 ? (
        <>
          <h2 className="section-title">Lo que más pesa en tu examen</h2>
          {renderGrid([null, ...weighted.map((w) => w.course)])}
          {others.length > 0 && (
            <>
              <h2 className="section-title">Otros cursos</h2>
              {renderGrid(others)}
            </>
          )}
        </>
      ) : (
        renderGrid([null, ...allCourses])
      )}

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
        <p className="muted small">Por ahora hay {available} preguntas en esta selección; se usarán todas.</p>
      )}

      <div className="sticky-cta">
        <motion.button whileTap={tap} className="btn btn-primary big full" onClick={() => onStart(course, Math.min(count, available))}>
          ¡Empezar!
        </motion.button>
      </div>
    </Screen>
  )
}
