import { ArrowLeft, Check, HardHat, HeartPulse, Landmark, type LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import type { AreaId, ExamConfig } from '../types'
import { Screen } from '../ui'
import { itemVariants, listVariants, tap } from '../lib/ui-helpers'

const AREA_LOOK: Record<AreaId, { icon: LucideIcon; hue: number }> = {
  A: { icon: HeartPulse, hue: 350 },
  B: { icon: Landmark, hue: 205 },
  C: { icon: HardHat, hue: 35 },
}

type Props = {
  exam: ExamConfig
  current?: AreaId
  onPick: (area: AreaId) => void
  /** Si no hay, el alumno debe elegir sí o sí (primera vez). */
  onBack?: () => void
}

export function AreaPicker({ exam, current, onPick, onBack }: Props) {
  return (
    <Screen>
      <header className="topbar">
        {onBack && (
          <motion.button className="link" whileTap={tap} onClick={onBack}>
            <ArrowLeft size={18} strokeWidth={2.6} /> Volver
          </motion.button>
        )}
      </header>

      <h1 className="page-title">¿A qué área postulas?</h1>
      <p className="muted">
        Tu práctica y el examen del domingo se arman con los cursos que más pesan en tu área. Puedes cambiarla cuando quieras.
      </p>

      <motion.div className="stack-sm" variants={listVariants} initial="hidden" animate="show">
        {(exam.areas ?? []).map((a) => {
          const { icon: Icon, hue } = AREA_LOOK[a.id]
          const active = current === a.id
          return (
            <motion.button
              key={a.id}
              variants={itemVariants}
              whileTap={tap}
              className={`card area-card ${active ? 'active' : ''}`}
              style={{ ['--hue' as string]: hue }}
              onClick={() => onPick(a.id)}
            >
              <span className="area-icon" aria-hidden="true">
                <Icon size={28} strokeWidth={2.3} />
              </span>
              <span className="area-text">
                <span className="area-letter">ÁREA {a.id}</span>
                <strong>{a.name}</strong>
                <span className="muted small">{a.examples}</span>
              </span>
              {active && <Check size={22} strokeWidth={3} aria-label="Elegida" />}
            </motion.button>
          )
        })}
      </motion.div>

      <p className="muted small text-center">¿No sabes en qué área está tu carrera? Revísalo en el prospecto de admisión de la UNICA.</p>
    </Screen>
  )
}
