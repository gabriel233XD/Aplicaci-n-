import type { ExamConfig } from '../types'
import { unicaQuestions } from './unica'
import { unicaAreaBQuestions } from './unica-area-b'

// Cada examen tiene su propio banco de preguntas y su propio progreso,
// para no mezclar la UNICA con Beca 18 ni con otras universidades.
export const exams: ExamConfig[] = [
  {
    id: 'unica',
    name: 'UNICA',
    fullName: 'Universidad Nacional San Luis Gonzaga de Ica',
    description: 'Prepárate para el examen de admisión de la UNICA.',
    available: true,
    questions: [...unicaQuestions, ...unicaAreaBQuestions],
    // Estructura provisional: se ajustará con el prospecto oficial.
    weekly: { questionCount: 100, minutes: 180, entryCost: 100 },
  },
  {
    id: 'beca18',
    name: 'Beca 18',
    fullName: 'Examen Nacional de Preselección – Pronabec',
    description: 'Próximamente.',
    available: false,
    questions: [],
    weekly: { questionCount: 100, minutes: 180, entryCost: 100 },
  },
  {
    id: 'otras',
    name: 'Otras universidades',
    fullName: 'San Marcos, UNI y más universidades del Perú',
    description: 'Próximamente.',
    available: false,
    questions: [],
    weekly: { questionCount: 100, minutes: 180, entryCost: 100 },
  },
]
