import type { Area, ExamConfig, Progress, Question, ShownQuestion } from '../types'
import { shuffle } from './game'

export function currentArea(exam: ExamConfig, progress: Progress): Area | null {
  return exam.areas?.find((a) => a.id === progress.extra.area) ?? null
}

/** Cursos del área ordenados de mayor a menor peso en el examen. */
export function weightedCourses(area: Area): { course: string; count: number }[] {
  return Object.entries(area.distribution ?? {})
    .map(([course, count]) => ({ course, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Elige `total` preguntas respetando la proporción de cursos del examen real
 * (método del mayor residuo). Si un curso no tiene suficientes preguntas,
 * se completa con preguntas de otros cursos.
 */
export function pickByDistribution(pool: Question[], distribution: Record<string, number>, total: number): ShownQuestion[] {
  const entries = Object.entries(distribution)
  const sum = entries.reduce((a, [, n]) => a + n, 0)
  const raw = entries.map(([course, n]) => ({ course, exact: (n / sum) * total }))
  const quota = new Map(raw.map((r) => [r.course, Math.floor(r.exact)]))
  let left = total - [...quota.values()].reduce((a, n) => a + n, 0)
  for (const r of [...raw].sort((a, b) => (b.exact % 1) - (a.exact % 1))) {
    if (left <= 0) break
    quota.set(r.course, (quota.get(r.course) ?? 0) + 1)
    left--
  }

  const chosen: Question[] = []
  const used = new Set<string>()
  for (const [course, n] of quota) {
    for (const q of shuffle(pool.filter((q) => q.course === course)).slice(0, n)) {
      chosen.push(q)
      used.add(q.id)
    }
  }
  // Completar si faltan preguntas en algún curso (primero cursos del área, luego el resto).
  const rest = shuffle(pool.filter((q) => !used.has(q.id))).sort(
    (a, b) => Number(b.course in distribution) - Number(a.course in distribution),
  )
  chosen.push(...rest.slice(0, Math.max(0, total - chosen.length)))

  // Orden como en el examen: agrupado por curso, de más a menos peso.
  const order = (c: string) => -(distribution[c] ?? 0)
  return shuffle(chosen)
    .sort((a, b) => order(a.course) - order(b.course))
    .map((question) => ({ question, order: shuffle(question.options.map((_, i) => i)) }))
}

/** Preguntas para el examen del domingo o un mini simulacro, según el área. */
export function examQuestions(exam: ExamConfig, area: Area | null, total: number): ShownQuestion[] {
  if (area?.distribution) return pickByDistribution(exam.questions, area.distribution, total)
  return shuffle(exam.questions)
    .slice(0, total)
    .map((question) => ({ question, order: shuffle(question.options.map((_, i) => i)) }))
}

export const MINI_SIMULACRO = 20
