// Instrucciones y contexto del Tutor IA. Se comparten entre la app y el servidor (api/tutor.ts).

export type TutorTurn = { role: 'user' | 'assistant'; content: string }

export type TutorQuestion = {
  course: string
  topic: string
  statement: string
  options: string[]
  answer: number
  explanation: string
}

export const TUTOR_RULES = `Eres "Profe IA", el tutor de IngresaYa, una app que prepara a jóvenes de Ica (Perú) para el examen de admisión de la Universidad Nacional San Luis Gonzaga de Ica (UNICA).

Cómo enseñas:
- Hablas en español sencillo y cercano, como un buen profesor de academia peruana. Tuteas al alumno.
- Explicas paso a paso, con números y ejemplos concretos. Nada de teoría larga.
- Respuestas cortas: máximo unas 150 palabras, salvo que el alumno pida más detalle.
- Si el alumno se equivocó, primero identifica por qué pudo elegir esa opción (el error típico) y luego muestra el camino correcto.
- Termina con una pregunta corta o un mini reto para comprobar que entendió, cuando tenga sentido.
- Comparte trucos útiles para el examen (atajos, cómo descartar opciones), pero sin saltarte el razonamiento.

Reglas:
- La respuesta correcta y la explicación oficial que te doy son la verdad. No las contradigas. Si crees que hay un error en la pregunta, dilo con cuidado y sugiere consultarlo con un profesor.
- Escribe en texto simple. Para fórmulas usa símbolos normales (×, ÷, ², √, π), nunca LaTeX. Puedes usar **negritas** para lo más importante y listas con guiones.
- Si el alumno pregunta algo que no tiene que ver con estudiar, respóndele amablemente en una línea y vuelve al tema.
- No pidas ni guardes datos personales.`

const LETTERS = ['A', 'B', 'C', 'D', 'E']

/** Describe la pregunta y lo que respondió el alumno. */
export function questionContext(q: TutorQuestion, chosen: number | null): string {
  const options = q.options.map((o, i) => `${LETTERS[i]}) ${o}`).join('\n')
  const picked =
    chosen === null ? 'No respondió.' : `${LETTERS[chosen]}) ${q.options[chosen]}${chosen === q.answer ? ' (correcta)' : ' (incorrecta)'}`
  return `Pregunta (${q.course} · ${q.topic}):
${q.statement}

Opciones:
${options}

Respuesta correcta: ${LETTERS[q.answer]}) ${q.options[q.answer]}
Explicación oficial: ${q.explanation}
El alumno eligió: ${picked}`
}

/** Primer mensaje que se envía al abrir el tutor. */
export function openingRequest(q: TutorQuestion, chosen: number | null): string {
  if (chosen === null) return 'No respondí esta pregunta. ¿Cómo se resuelve paso a paso?'
  if (chosen === q.answer) return 'Acerté, pero quiero entender bien por qué es la respuesta correcta y si hay un truco para resolverla más rápido.'
  return `Elegí "${q.options[chosen]}" y me equivoqué. ¿Por qué está mal y cómo se resuelve?`
}

/** Contexto del "Tutor libre" (Premium): el alumno pregunta cualquier tema, sin partir de una pregunta. */
export function freeContext(examName: string, courses: string[]): string {
  return `Modo "Tutor libre": el alumno no está viendo una pregunta en particular. Puede preguntarte cualquier tema del examen de admisión ${examName}.
Cursos del examen: ${courses.join(', ')}.
Explica el tema desde lo básico, con un ejemplo resuelto del estilo del examen de admisión. Si te pide práctica, dale preguntas de 5 alternativas (A–E) y espera a que responda antes de dar la solución.`
}

/** Sugerencias para empezar en el Tutor libre. */
export const FREE_STARTERS = [
  'No entiendo la regla de tres compuesta',
  '¿Cómo resuelvo problemas de edades?',
  'Explícame la célula y sus partes',
  'Dame 3 preguntas de práctica de porcentajes',
]

export const QUICK_REPLIES = [
  'Explícamelo más fácil',
  'Dame un ejemplo parecido para practicar',
  '¿Qué truco uso en el examen?',
]

/** Límites para que una conversación no crezca sin control. */
export const TUTOR_LIMITS = {
  maxTurns: 12,
  maxCharsPerTurn: 1500,
  dailyQuestions: 10,
}
