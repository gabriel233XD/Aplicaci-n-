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
}

/** Una pregunta tal como se muestra: con las opciones barajadas. */
export type ShownQuestion = {
  question: Question
  /** order[i] = índice original de la opción mostrada en la posición i. */
  order: number[]
}
