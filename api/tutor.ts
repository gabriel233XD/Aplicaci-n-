// Función de servidor del Tutor IA (formato de Vercel Functions: POST /api/tutor).
// Necesita la variable de entorno ANTHROPIC_API_KEY. La clave nunca llega al navegador.
//
// Modelo: Claude Haiku 5.5 por defecto, elegido por costo para el plan Premium de S/ 5
// (unos céntimos por alumno al mes). Se puede cambiar con la variable TUTOR_MODEL.

import Anthropic from '@anthropic-ai/sdk'
import { TUTOR_LIMITS, TUTOR_RULES, type TutorTurn } from '../src/lib/tutorPrompt.js'

const client = new Anthropic()
const MODEL = process.env.TUTOR_MODEL || 'claude-haiku-5-5'

function bad(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function isTurn(t: unknown): t is TutorTurn {
  const x = t as TutorTurn
  return !!x && (x.role === 'user' || x.role === 'assistant') && typeof x.content === 'string' && x.content.trim() !== ''
}

export async function POST(request: Request): Promise<Response> {
  let body: { context?: unknown; turns?: unknown }
  try {
    body = await request.json()
  } catch {
    return bad(400, 'JSON inválido')
  }

  const context = typeof body.context === 'string' ? body.context.slice(0, 6000) : ''
  const turns = Array.isArray(body.turns) ? body.turns.filter(isTurn) : []
  if (!context || turns.length === 0 || turns.length > TUTOR_LIMITS.maxTurns) return bad(400, 'Conversación inválida')
  if (turns[0].role !== 'user' || turns[turns.length - 1].role !== 'user') return bad(400, 'La conversación debe empezar y terminar con el alumno')

  const messages: Anthropic.MessageParam[] = turns.map((t, i) => ({
    role: t.role,
    content: (i === 0 ? `${context}\n\n---\n\n` : '') + t.content.slice(0, TUTOR_LIMITS.maxCharsPerTurn * 2),
  }))

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const response = client.messages.stream(
          {
            model: MODEL,
            max_tokens: 2000,
            system: TUTOR_RULES,
            output_config: { effort: 'low' },
            messages,
          },
          { signal: request.signal },
        )
        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
        const final = await response.finalMessage()
        if (final.stop_reason === 'refusal') controller.enqueue(encoder.encode('\u0000REFUSED'))
        controller.close()
      } catch (error) {
        if (error instanceof Anthropic.RateLimitError) {
          console.error('Tutor: límite de uso de la API')
        } else if (error instanceof Anthropic.AuthenticationError) {
          console.error('Tutor: ANTHROPIC_API_KEY inválida o ausente')
        } else if (error instanceof Anthropic.APIError) {
          console.error(`Tutor: error de la API ${error.status}`, error.message)
        } else {
          console.error('Tutor: error inesperado', error)
        }
        controller.error(error)
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
