import type { Progress, Question, ShownQuestion } from '../types'

// ── Reglas del juego (monedas) ──
export const RULES = {
  welcomeCoins: 50,
  coinsPerCorrect: 1,
  passBonus: 5,
  passPercent: 70,
  streakBonus: 5,
  top10Bonus: 50,
  pointsPerQuestion: 10,
  /** Domingo, de 8:00 a 20:00 (hora local). */
  weeklyOpenHour: 8,
  weeklyCloseHour: 20,
}

export const PRACTICE_SIZES = [5, 10, 20, 50]

export function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Elige preguntas al azar y baraja sus opciones (para dificultar el plagio). */
export function pickQuestions(pool: Question[], count: number): ShownQuestion[] {
  return shuffle(pool)
    .slice(0, count)
    .map((question) => ({ question, order: shuffle(question.options.map((_, i) => i)) }))
}

export function dayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Identificador de la semana: la fecha del domingo de esa semana. */
export function weekId(d = new Date()): string {
  const sunday = new Date(d)
  sunday.setDate(d.getDate() + ((7 - d.getDay()) % 7))
  return dayKey(sunday)
}

export function isWeeklyOpen(d = new Date()): boolean {
  const h = d.getHours()
  return d.getDay() === 0 && h >= RULES.weeklyOpenHour && h < RULES.weeklyCloseHour
}

export function nextWeeklyOpening(d = new Date()): Date {
  const next = new Date(d)
  next.setHours(RULES.weeklyOpenHour, 0, 0, 0)
  const daysUntilSunday = (7 - d.getDay()) % 7
  next.setDate(d.getDate() + daysUntilSunday)
  if (next <= d) next.setDate(next.getDate() + 7)
  return next
}

/** Agrega estadísticas por tema y devuelve los temas más débiles. */
export function weakTopics(progress: Progress, limit = 3) {
  return Object.entries(progress.topicStats)
    .filter(([, s]) => s.total >= 2)
    .map(([topic, s]) => ({ topic, ...s, pct: Math.round((s.correct / s.total) * 100) }))
    .filter((t) => t.pct < 70)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, limit)
}

/**
 * Ranking SIMULADO para el prototipo: genera puntajes de otros postulantes.
 * Se reemplazará por un ranking real cuando haya servidor.
 */
export function simulatedRanking(myScore: number, maxScore: number, participants = 120) {
  const others = Array.from({ length: participants - 1 }, () => {
    // Distribución aproximada en campana alrededor del 45%.
    const r = (Math.random() + Math.random() + Math.random()) / 3
    return Math.round((r * 0.9 + 0.02) * maxScore / 10) * 10
  })
  const position = others.filter((s) => s > myScore).length + 1
  return { position, participants }
}
