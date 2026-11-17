import type { Variants } from 'framer-motion'
import type { CSSProperties } from 'react'

// ── Animaciones compartidas ──

export const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 30 } },
}

export const tap = { scale: 0.97 }

// ── Identidad visual de cada curso ──

const COURSE_META: Record<string, { hue: number }> = {
  'Razonamiento Matemático': { hue: 265 },
  'Razonamiento Verbal': { hue: 205 },
  Aritmética: { hue: 25 },
  Álgebra: { hue: 330 },
  Geometría: { hue: 45 },
  Biología: { hue: 140 },
  Química: { hue: 178 },
  Física: { hue: 220 },
  'Historia y Cultura': { hue: 12 },
  'Historia y Geografía': { hue: 12 },
  Lenguaje: { hue: 190 },
  Literatura: { hue: 290 },
  'Psicología y Filosofía': { hue: 310 },
  'Cívica y Economía': { hue: 95 },
  Trigonometría: { hue: 60 },
}

export function courseMeta(course: string | null) {
  return (course && COURSE_META[course]) || { hue: 172 }
}

export function courseStyle(course: string | null): CSSProperties {
  return { ['--hue' as string]: courseMeta(course).hue }
}

