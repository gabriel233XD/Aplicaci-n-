import type { ExamConfig, Progress, ProgressExtra, Question } from '../types'
import { dayKey } from './game'

// ── Fechas ──

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  return dayKey(new Date(y, m - 1, d + n))
}

// ── Repaso de errores (repaso espaciado tipo Leitner) ──
// Al fallar una pregunta entra a la caja 0 y vuelve mañana.
// Cada acierto la sube de caja y la espera crece: 1 → 3 → 7 días. Tras 3 aciertos se considera dominada.
const REVIEW_WAIT = [1, 3, 7]

/** Actualiza el historial diario y la cola de repaso con las respuestas de una sesión. */
export function recordAnswers(extra: ProgressExtra, items: { question: Question; correct: boolean }[], today = dayKey()): ProgressExtra {
  const mistakes = { ...(extra.mistakes ?? {}) }
  let mastered = extra.mastered ?? 0
  const history = { ...(extra.history ?? {}) }
  const dayStats = { ...(history[today] ?? {}) }

  for (const { question, correct } of items) {
    const [a, c] = dayStats[question.course] ?? [0, 0]
    dayStats[question.course] = [a + 1, c + (correct ? 1 : 0)]

    const entry = mistakes[question.id]
    if (!correct) {
      mistakes[question.id] = { box: 0, due: addDays(today, 1) }
    } else if (entry && entry.due <= today) {
      const box = entry.box + 1
      if (box >= REVIEW_WAIT.length) {
        delete mistakes[question.id]
        mastered++
      } else {
        mistakes[question.id] = { box, due: addDays(today, REVIEW_WAIT[box]) }
      }
    }
  }
  history[today] = dayStats

  // Solo se guardan los últimos 70 días de historial.
  const oldest = addDays(today, -70)
  for (const day of Object.keys(history)) if (day < oldest) delete history[day]

  return { ...extra, mistakes, mastered, history }
}

/** Preguntas falladas que toca repasar hoy. */
export function dueMistakes(extra: ProgressExtra, exam: ExamConfig, today = dayKey()): Question[] {
  const due = Object.entries(extra.mistakes ?? {})
    .filter(([, m]) => m.due <= today)
    .map(([id]) => id)
  return exam.questions.filter((q) => due.includes(q.id))
}

export function pendingMistakes(extra: ProgressExtra): number {
  return Object.keys(extra.mistakes ?? {}).length
}

// ── Pregunta del día ──

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/** La misma pregunta para todos los alumnos durante el día. */
export function dailyQuestion(exam: ExamConfig, today = dayKey()): Question {
  return exam.questions[hash(`${exam.id}:${today}`) % exam.questions.length]
}

export const DAILY_REWARD = { correct: 10, tried: 2 }

// ── Logros ──

export type Achievement = { id: string; icon: string; name: string; description: string; check: (p: Progress) => boolean }

const realWeekly = (p: Progress) => p.weeklyResults.filter((r) => !r.weekId.startsWith('demo-'))

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'primer-paso', icon: 'footprints', name: 'Primer paso', description: 'Responde tu primera pregunta', check: (p) => p.answered >= 1 },
  { id: 'cien', icon: 'target', name: 'Cien preguntas', description: 'Responde 100 preguntas', check: (p) => p.answered >= 100 },
  { id: 'quinientas', icon: 'mountain', name: 'Imparable', description: 'Responde 500 preguntas', check: (p) => p.answered >= 500 },
  { id: 'racha-3', icon: 'flame', name: 'En racha', description: 'Practica 3 días seguidos', check: (p) => p.streak >= 3 },
  { id: 'racha-7', icon: 'flame-kindling', name: 'Semana de fuego', description: 'Practica 7 días seguidos', check: (p) => p.streak >= 7 },
  { id: 'racha-30', icon: 'trophy', name: 'Disciplina total', description: 'Practica 30 días seguidos', check: (p) => p.streak >= 30 },
  { id: 'perfecto', icon: 'sparkles', name: 'Perfecto', description: 'Acierta 10 de 10 en una práctica', check: (p) => !!p.extra.flags?.perfect },
  { id: 'domingo', icon: 'calendar-check', name: 'Postulante', description: 'Da tu primer Examen de Admisión del domingo', check: (p) => realWeekly(p).length >= 1 },
  { id: 'top10', icon: 'medal', name: 'Top 10 de Ica', description: 'Queda entre los 10 mejores del domingo', check: (p) => realWeekly(p).some((r) => !r.simulated && r.position > 0 && r.position <= 10) },
  { id: 'repaso', icon: 'brain', name: 'Aprendo de mis errores', description: 'Domina 10 preguntas que habías fallado', check: (p) => (p.extra.mastered ?? 0) >= 10 },
  { id: 'duelista', icon: 'swords', name: 'Duelista', description: 'Gana un duelo 1 vs 1', check: (p) => !!p.extra.flags?.duelWon },
  { id: 'amigo', icon: 'users', name: 'Buen amigo', description: 'Invita a un amigo que se registre', check: (p) => !!p.extra.flags?.invited },
]

/** Logros que se acaban de cumplir (aún no guardados). */
export function newAchievements(p: Progress): Achievement[] {
  const have = p.extra.achievements ?? {}
  return ACHIEVEMENTS.filter((a) => !have[a.id] && a.check(p))
}

// ── Estadísticas para "Mi progreso" ──

/** Respondidas y correctas de los últimos `days` días (del más antiguo al de hoy). */
export function dailySeries(extra: ProgressExtra, days = 14, today = dayKey()) {
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(today, i - days + 1)
    const stats = Object.values(extra.history?.[day] ?? {})
    return { day, answered: stats.reduce((s, [a]) => s + a, 0), correct: stats.reduce((s, [, c]) => s + c, 0) }
  })
}

/** Aciertos por curso, sumando el historial de todos los días guardados. */
export function courseAccuracy(extra: ProgressExtra) {
  const totals: Record<string, [number, number]> = {}
  for (const dayStats of Object.values(extra.history ?? {})) {
    for (const [course, [a, c]] of Object.entries(dayStats)) {
      const [ta, tc] = totals[course] ?? [0, 0]
      totals[course] = [ta + a, tc + c]
    }
  }
  return Object.entries(totals)
    .map(([course, [answered, correct]]) => ({ course, answered, correct, pct: Math.round((correct / answered) * 100) }))
    .sort((a, b) => b.answered - a.answered)
}
