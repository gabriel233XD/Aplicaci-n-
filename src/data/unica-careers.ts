// Puntajes mínimos de ingreso por carrera de la UNICA, para "¿Ingresarías?".
//
// ⚠️ Esta lista está VACÍA a propósito: solo debe llenarse con datos reales y verificados
// (por ejemplo, del último proceso de admisión publicado por la UNICA). Mientras esté vacía,
// la app no muestra la comparación, para no engañar a los alumnos con números inventados.
//
// `minPercent` es el porcentaje de aciertos que equivale al puntaje mínimo de ingreso,
// porque el puntaje de la app (0–1000) no usa la misma escala que el examen real.
//
// Ejemplo de cómo agregar una carrera:
//   { career: 'Enfermería', area: 'Ciencias de la Salud', minPercent: 62, source: 'Admisión 2026-I' },

export type CareerCutoff = { career: string; area: string; minPercent: number; source: string }

export const UNICA_CAREERS: CareerCutoff[] = []
