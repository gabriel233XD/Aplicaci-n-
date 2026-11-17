import { GraduationCap } from 'lucide-react'
import { motion } from 'framer-motion'
import { exams } from '../data/exams'
import { Screen } from '../ui'
import { itemVariants, listVariants, tap } from '../lib/ui-helpers'

export function ExamPicker({ onPick }: { onPick: (id: string) => void }) {
  return (
    <Screen>
      <header className="hero">
        <Dunes />
        <motion.div
          className="hero-mark"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
        >
          <GraduationCap size={56} strokeWidth={2} />
        </motion.div>
        <motion.h1
          className="hero-title"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          Ingresa<span>Ya</span>
        </motion.h1>
        <motion.p className="hero-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          Prepárate para la universidad jugando. Practica, gana monedas y compite cada domingo.
        </motion.p>
      </header>

      <h2 className="section-title">¿Para qué examen te preparas?</h2>
      <motion.div className="stack" variants={listVariants} initial="hidden" animate="show">
        {exams.map((exam) => (
          <motion.button
            key={exam.id}
            variants={itemVariants}
            whileHover={exam.available ? { y: -3 } : undefined}
            whileTap={exam.available ? tap : undefined}
            className={`card exam-card ${exam.available ? '' : 'disabled'}`}
            disabled={!exam.available}
            onClick={() => onPick(exam.id)}
          >
            <div className="exam-card-body">
              <div className="exam-name">{exam.name}</div>
              <div className="muted small">{exam.fullName}</div>
            </div>
            {exam.available ? <span className="go">Empezar →</span> : <span className="badge">Próximamente</span>}
          </motion.button>
        ))}
      </motion.div>
    </Screen>
  )
}

/** Dunas de Ica dibujadas detrás del título. */
export function Dunes() {
  return (
    <svg className="dunes" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
      <motion.path
        d="M0 80 C 60 40, 120 40, 180 70 S 300 110, 400 60 L400 120 L0 120 Z"
        fill="var(--dune-2)"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
      <motion.path
        d="M0 100 C 80 70, 160 80, 240 95 S 360 90, 400 85 L400 120 L0 120 Z"
        fill="var(--dune-1)"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.15, ease: 'easeOut' }}
      />
    </svg>
  )
}
