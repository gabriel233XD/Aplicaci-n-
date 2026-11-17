import { useCallback, useState } from 'react'
import type { Progress } from '../types'
import { RULES } from './game'

// Prototipo: el progreso se guarda en el navegador (separado por examen).
// Más adelante se moverá a un servidor con cuentas de usuario.

const newProgress = (): Progress => ({
  coins: RULES.welcomeCoins,
  streak: 0,
  lastPracticeDay: null,
  answered: 0,
  topicStats: {},
  weeklyResults: [],
})

const key = (examId: string) => `ingresaya:progress:${examId}`

function load(examId: string): Progress {
  try {
    const raw = localStorage.getItem(key(examId))
    if (raw) return { ...newProgress(), ...JSON.parse(raw) }
  } catch {
    // Almacenamiento no disponible: se usa progreso nuevo.
  }
  return newProgress()
}

function save(examId: string, p: Progress) {
  try {
    localStorage.setItem(key(examId), JSON.stringify(p))
  } catch {
    // Ignorar: la app sigue funcionando sin guardar.
  }
}

export function useProgress(examId: string) {
  const [progress, setProgress] = useState<Progress>(() => load(examId))

  const update = useCallback(
    (fn: (p: Progress) => Progress) => {
      setProgress((prev) => {
        const next = fn(prev)
        save(examId, next)
        return next
      })
    },
    [examId],
  )

  return [progress, update] as const
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
