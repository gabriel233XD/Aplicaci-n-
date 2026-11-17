import { animate, motion, useMotionValue, useTransform, type HTMLMotionProps } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  BookOpen, Dna, Divide, Flame, FlaskConical, Landmark, MessageSquareText, Puzzle, Triangle, Variable, Zap,
  type LucideIcon,
} from 'lucide-react'
import { courseStyle } from './lib/ui-helpers'

/** Contenedor de cada pantalla: entra deslizando y sale desvaneciéndose. */
export function Screen({ children, className = '', ...rest }: HTMLMotionProps<'div'> & { children: ReactNode }) {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  return (
    <motion.div
      className={`screen ${className}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/** Número que sube animado hasta su valor. */
export function CountUp({ value, duration = 1 }: { value: number; duration?: number }) {
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString('es-PE'))
  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [mv, value, duration])
  return <motion.span>{rounded}</motion.span>
}

/** Pastilla de monedas que rebota cuando cambia el saldo. */
export function CoinPill({ coins }: { coins: number }) {
  const prev = useRef(coins)
  const [bump, setBump] = useState(0)
  useEffect(() => {
    if (coins !== prev.current) {
      prev.current = coins
      setBump((b) => b + 1)
    }
  }, [coins])
  return (
    <motion.span
      key={bump}
      className="pill pill-coin"
      initial={bump ? { scale: 1.25 } : false}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
      title="Monedas"
    >
      <span className="coin" aria-hidden="true" />
      <CountUp value={coins} duration={0.6} />
    </motion.span>
  )
}

export function StreakPill({ streak }: { streak: number }) {
  return (
    <span className={`pill pill-streak ${streak > 0 ? 'on' : ''}`} title="Días seguidos practicando">
      <motion.span
        aria-hidden="true"
        animate={streak > 0 ? { rotate: [0, -8, 8, -4, 0], scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2.5 }}
      >
        <Flame size={18} strokeWidth={2.5} />
      </motion.span>
      {streak}
    </span>
  )
}

/** Anillo de progreso animado (porcentaje). */
export function Ring({ pct, size = 140, children }: { pct: number; size?: number; children?: ReactNode }) {
  const stroke = 12
  const r = (size - stroke) / 2
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={pct >= 70 ? 'var(--ok)' : pct >= 40 ? 'var(--gold)' : 'var(--bad)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.max(pct, 0.5) / 100 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  )
}

/** Lluvia de monedas para celebrar. */
export function CoinBurst({ count = 14 }: { count?: number }) {
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 320,
      y: -120 - Math.random() * 160,
      rotate: (Math.random() - 0.5) * 540,
      delay: Math.random() * 0.25,
    })),
  )
  return (
    <div className="burst" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="coin coin-lg"
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 260], opacity: [1, 1, 0], scale: 1, rotate: p.rotate }}
          transition={{ duration: 1.6, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

const COURSE_ICONS: Record<string, LucideIcon> = {
  'Razonamiento Matemático': Puzzle,
  'Razonamiento Verbal': MessageSquareText,
  Aritmética: Divide,
  Álgebra: Variable,
  Geometría: Triangle,
  Biología: Dna,
  Química: FlaskConical,
  Física: Zap,
  'Historia y Cultura': Landmark,
}

const ICON_SIZE = { sm: 17, md: 22, lg: 28 }

export function CourseIcon({ course, size = 'md' }: { course: string | null; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`course-icon course-icon-${size}`} style={courseStyle(course)} aria-hidden="true">
      {(() => {
        const Icon = (course && COURSE_ICONS[course]) || BookOpen
        return <Icon size={ICON_SIZE[size]} strokeWidth={2.4} />
      })()}
    </span>
  )
}
