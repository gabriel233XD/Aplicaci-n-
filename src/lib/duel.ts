// Duelos 1 vs 1: tipos y reglas para decidir quién gana.

export type Duel = {
  id: string
  examId: string
  questionIds: string[]
  creator: { alias: string; correct: number; ms: number }
  opponent: { alias: string; correct: number; ms: number } | null
  role: 'creator' | 'opponent' | 'new' | 'viewer'
  expired: boolean
  createdAt: string
}

export type DuelOutcome = 'win' | 'lose' | 'tie' | 'waiting'

/** Gana quien acierta más; si empatan, quien terminó más rápido. */
export function duelOutcome(d: Duel): DuelOutcome {
  if (!d.opponent) return 'waiting'
  const me = d.role === 'creator' ? d.creator : d.opponent
  const rival = d.role === 'creator' ? d.opponent : d.creator
  if (me.correct !== rival.correct) return me.correct > rival.correct ? 'win' : 'lose'
  if (me.ms !== rival.ms) return me.ms < rival.ms ? 'win' : 'lose'
  return 'tie'
}

export const seconds = (ms: number) => `${Math.round(ms / 1000)} s`

