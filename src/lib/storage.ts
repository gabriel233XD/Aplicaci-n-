import { useCallback, useEffect, useRef, useState } from 'react'
import type { Progress, WeeklyResult } from '../types'
import { RULES } from './game'
import { supabase } from './supabase'

// El progreso se guarda siempre en el navegador (para que la app abra rápido y funcione sin internet)
// y, si el alumno tiene cuenta, también en el servidor (Supabase), separado por examen.

const newProgress = (): Progress => ({
  coins: RULES.welcomeCoins,
  streak: 0,
  lastPracticeDay: null,
  answered: 0,
  topicStats: {},
  weeklyResults: [],
  extra: {},
})

const key = (examId: string, userId: string | null) =>
  userId ? `ingresaya:progress:${examId}:${userId}` : `ingresaya:progress:${examId}`

function load(examId: string, userId: string | null): Progress {
  try {
    const raw = localStorage.getItem(key(examId, userId))
    if (raw) return { ...newProgress(), ...JSON.parse(raw) }
  } catch {
    // Almacenamiento no disponible: se usa progreso nuevo.
  }
  return newProgress()
}

function save(examId: string, userId: string | null, p: Progress) {
  try {
    localStorage.setItem(key(examId, userId), JSON.stringify(p))
  } catch {
    // Ignorar: la app sigue funcionando sin guardar.
  }
}

type ProgressRow = {
  coins: number
  streak: number
  last_practice_day: string | null
  answered: number
  topic_stats: Progress['topicStats']
  extra?: Progress['extra']
}

// Si todavía no se ejecutó la migración 0004 (columna `extra`), la app sigue funcionando sin ella.
let hasExtraColumn = true

const toRow = (p: Progress): ProgressRow => ({
  coins: p.coins,
  streak: p.streak,
  last_practice_day: p.lastPracticeDay,
  answered: p.answered,
  topic_stats: p.topicStats,
  ...(hasExtraColumn ? { extra: p.extra } : {}),
})

const BASE_COLUMNS = 'coins, streak, last_practice_day, answered, topic_stats'

async function fetchProgressRow(examId: string) {
  if (!supabase) return { data: null, error: null }
  if (hasExtraColumn) {
    const res = await supabase.from('progress').select(`${BASE_COLUMNS}, extra`).eq('exam_id', examId).maybeSingle()
    if (res.error?.code !== '42703') return res
    hasExtraColumn = false // columna inexistente
  }
  return supabase.from('progress').select(BASE_COLUMNS).eq('exam_id', examId).maybeSingle()
}

type ResultRow = { week_id: string; score: number; max_score: number; correct: number; total_questions: number; created_at: string }

/** Une los resultados del servidor con los guardados en el celular (que tienen el puesto). */
function mergeResults(server: ResultRow[], local: WeeklyResult[]): WeeklyResult[] {
  const byWeek = new Map(local.map((r) => [r.weekId, r]))
  const merged = server.map((r) => ({
    weekId: r.week_id,
    date: r.created_at,
    score: r.score,
    maxScore: r.max_score,
    correct: r.correct,
    totalQuestions: r.total_questions,
    position: byWeek.get(r.week_id)?.position ?? 0,
    participants: byWeek.get(r.week_id)?.participants ?? 0,
  }))
  const serverWeeks = new Set(merged.map((r) => r.weekId))
  const demos = local.filter((r) => !serverWeeks.has(r.weekId) && r.weekId.startsWith('demo-'))
  return [...merged, ...demos].sort((a, b) => a.date.localeCompare(b.date))
}

export type SyncState = 'local' | 'loading' | 'synced' | 'saving' | 'offline'

export function useProgress(examId: string, userId: string | null) {
  const [progress, setProgress] = useState<Progress>(() => load(examId, userId))
  const [sync, setSync] = useState<SyncState>(userId ? 'loading' : 'local')
  const pending = useRef<Progress | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Al iniciar sesión (o cambiar de examen), trae el progreso del servidor.
  useEffect(() => {
    const local = load(examId, userId)
    setProgress(local)
    if (!userId || !supabase) {
      setSync('local')
      return
    }
    setSync('loading')
    let cancelled = false
    ;(async () => {
      const [{ data: row, error }, { data: results }] = await Promise.all([
        fetchProgressRow(examId),
        supabase.from('weekly_results').select('week_id, score, max_score, correct, total_questions, created_at').eq('exam_id', examId),
      ])
      if (cancelled) return
      if (error) {
        setSync('offline')
        return
      }
      if (!row) {
        // Primera vez con cuenta en este examen: se sube lo que había en el celular como invitado.
        const guest = load(examId, null)
        const start = guest.answered > 0 ? guest : local
        await supabase.from('progress').insert({ user_id: userId, exam_id: examId, ...toRow(start) })
        if (cancelled) return
        const next = { ...start, weeklyResults: mergeResults((results ?? []) as ResultRow[], start.weeklyResults) }
        setProgress(next)
        save(examId, userId, next)
      } else {
        const r = row as ProgressRow
        const next: Progress = {
          coins: r.coins,
          streak: r.streak,
          lastPracticeDay: r.last_practice_day,
          answered: r.answered,
          topicStats: r.topic_stats ?? {},
          weeklyResults: mergeResults((results ?? []) as ResultRow[], local.weeklyResults),
          // Sin la columna en el servidor, se conserva lo guardado en el celular.
          extra: r.extra ?? local.extra ?? {},
        }
        setProgress(next)
        save(examId, userId, next)
      }
      setSync('synced')
    })()
    return () => {
      cancelled = true
    }
  }, [examId, userId])

  const flush = useCallback(async () => {
    const p = pending.current
    if (!p || !userId || !supabase) return
    pending.current = null
    setSync('saving')
    const { error } = await supabase.from('progress').update({ ...toRow(p), updated_at: new Date().toISOString() }).eq('exam_id', examId).eq('user_id', userId)
    setSync(error ? 'offline' : 'synced')
    if (error) pending.current = pending.current ?? p
  }, [examId, userId])

  const update = useCallback(
    (fn: (p: Progress) => Progress) => {
      setProgress((prev) => {
        const next = fn(prev)
        save(examId, userId, next)
        if (userId) {
          pending.current = next
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => void flush(), 800)
        }
        return next
      })
    },
    [examId, userId, flush],
  )

  // Guarda lo pendiente al salir de la página.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      if (timer.current) clearTimeout(timer.current)
      void flush()
    }
  }, [flush])

  return [progress, update, sync] as const
}

export function loadSelectedExam(): string | null {
  try {
    return localStorage.getItem('ingresaya:exam')
  } catch {
    return null
  }
}

export function saveSelectedExam(id: string | null) {
  try {
    if (id) localStorage.setItem('ingresaya:exam', id)
    else localStorage.removeItem('ingresaya:exam')
  } catch {
    // ignorar
  }
}
