import type { Area } from '../types'

// Áreas del examen de admisión UNICA (sede Ica).
// `distribution` = cuántas preguntas trae el examen real de cada curso.
// Solo se llena con datos verificados de exámenes reales; si es null, la distribución está por confirmar.
export const UNICA_AREAS: Area[] = [
  {
    id: 'A',
    name: 'Ciencias de la Salud',
    examples: 'Medicina, Enfermería, Odontología, Obstetricia…',
    distribution: null,
  },
  {
    id: 'B',
    name: 'Humanidades y Sociales',
    examples: 'Derecho, Educación, Ciencias de la Comunicación…',
    // Fuente: examen real UNICA Área B (100 preguntas).
    distribution: {
      'Razonamiento Verbal': 20,
      'Razonamiento Matemático': 20,
      'Historia y Geografía': 15,
      'Cívica y Economía': 9,
      'Psicología y Filosofía': 8,
      Lenguaje: 7,
      Literatura: 7,
      Geometría: 2,
      Trigonometría: 2,
      Álgebra: 2,
      Aritmética: 2,
      Física: 2,
      Química: 2,
      Biología: 2,
    },
  },
  {
    id: 'C',
    name: 'Ingenierías',
    examples: 'Ingeniería Civil, de Sistemas, Mecánica Eléctrica…',
    distribution: null,
  },
]
