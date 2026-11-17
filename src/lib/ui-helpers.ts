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

const COURSE_META: Record<string, { icon: string; hue: number }> = {
  'Razonamiento Matemático': { icon: '🧩', hue: 265 },
  'Razonamiento Verbal': { icon: '💬', hue: 205 },
  Aritmética: { icon: '➗', hue: 25 },
  Álgebra: { icon: 'x²', hue: 330 },
  Geometría: { icon: '📐', hue: 45 },
  Biología: { icon: '🧬', hue: 140 },
  Química: { icon: '⚗️', hue: 178 },
  Física: { icon: '⚡', hue: 220 },
  'Historia y Cultura': { icon: '🏺', hue: 12 },
}

export function courseMeta(course: string | null) {
  return (course && COURSE_META[course]) || { icon: '📚', hue: 172 }
}

export function courseStyle(course: string | null): CSSProperties {
  return { ['--hue' as string]: courseMeta(course).hue }
}

