export type Question = {
  id: string
  course: string
  topic: string
  statement: string
  options: string[]
  /** Índice de la opción correcta dentro de `options`. */
  answer: number
  hint: string
  explanation: string
}

export type ExamConfig = {
  id: string
  name: string
  fullName: string
  description: string
  available: boolean
  questions: Question[]
  weekly: {
    questionCount: number
    minutes: number
    entryCost: number
  }
}

export type TopicStat = { correct: number; total: number }

export type WeeklyResult = {
  weekId: string
  date: string
  score: number
  maxScore: number
  correct: number
  totalQuestions: number
  /** 0 = puesto aún desconocido (se consulta al servidor). */
  position: number
  participants: number
  /** Top 10 real (con cuentas) o ausente si el ranking fue simulado. */
  top?: { position: number; alias: string; score: number; isMe: boolean }[]
  simulated?: boolean
  /** Mensaje si no se pudo guardar en el ranking. */
  rankingError?: string
}

export type Progress = {
  coins: number
  streak: number
  lastPracticeDay: string | null
  answered: number
  topicStats: Record<string, TopicStat>
  weeklyResults: WeeklyResult[]
  extra: ProgressExtra
}

/** Datos extra del progreso (se guardan en la columna `extra` de la base de datos). */
export type ProgressExtra = {
  /** Logros desbloqueados: id → fecha (AAAA-MM-DD). */
  achievements?: Record<string, string>
  /** Preguntas falladas para repasar (repaso espaciado): id → caja (0-2) y fecha en que toca. */
  mistakes?: Record<string, { box: number; due: string }>
  /** Cuántas preguntas falladas ya se dominaron con el repaso. */
  mastered?: number
  /** Pregunta del día: último día respondida y si acertó. */
  daily?: { day: string; correct: boolean }
  /** Historial por día: curso → [respondidas, correctas]. Se guardan los últimos 70 días. */
  history?: Record<string, Record<string, [number, number]>>
  /** Hechos que desbloquean logros especiales. */
  flags?: { perfect?: boolean; duelWon?: boolean; invited?: boolean }
}

/** Una pregunta tal como se muestra: con las opciones barajadas. */
export type ShownQuestion = {
  question: Question
  /** order[i] = índice original de la opción mostrada en la posición i. */
  order: number[]
}
