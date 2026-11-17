// Función de servidor del Tutor IA (formato de Vercel Functions: POST /api/tutor).
// Necesita la variable de entorno ANTHROPIC_API_KEY. La clave nunca llega al navegador.
//
// Cuentas: con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY configuradas, solo responde a alumnos
// con sesión iniciada y descuenta su límite diario en la base de datos (3 gratis, 10 premium).
// Sin cuentas configuradas responde con 503, salvo que TUTOR_ALLOW_GUESTS=1 (solo para pruebas).
//
// Modelo: Claude Haiku 5.5 por defecto, elegido por costo para el plan Premium de S/ 5
// (unos céntimos por alumno al mes). Se puede cambiar con la variable TUTOR_MODEL.

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { TUTOR_LIMITS, TUTOR_RULES, type TutorTurn } from '../src/lib/tutorPrompt.js'

const client = new Anthropic()
const MODEL = process.env.TUTOR_MODEL || 'claude-haiku-5-5'
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const ALLOW_GUESTS = process.env.TUTOR_ALLOW_GUESTS === '1'

/**
 * Verifica la sesión del alumno y gasta una consulta de su límite diario.
 * Devuelve las consultas restantes, o una respuesta de error.
 */
async function checkAccount(request: Request, free: boolean): Promise<{ remaining: number | null } | Response> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return ALLOW_GUESTS ? { remaining: null } : bad(503, 'Cuentas no configuradas')
  }
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return bad(401, 'login')
  // El cliente actúa como el alumno: las reglas de la base de datos se aplican con su identidad.
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: user, error: userError } = await db.auth.getUser(token)
  if (userError || !user.user) return bad(401, 'login')
  if (free) {
    // Tutor libre: solo Premium (Premium tiene un límite diario de 10; el plan gratis, 3).
    const { data: status } = await db.rpc('tutor_quota_status')
    if (!status || (status as { limit: number }).limit < 10) return bad(403, 'premium')
  }
  const { data: left, error } = await db.rpc('consume_tutor_quota')
  if (error) {
    console.error('Tutor: no se pudo descontar la consulta', error.message)
    return bad(500, 'quota')
  }
  if (typeof left !== 'number' || left < 0) return bad(429, 'limit')
  return { remaining: left }
}

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
  let body: { context?: unknown; turns?: unknown; mode?: unknown }
  try {
    body = await request.json()
  } catch {
    return bad(400, 'JSON inválido')
  }

  const context = typeof body.context === 'string' ? body.context.slice(0, 6000) : ''
  const turns = Array.isArray(body.turns) ? body.turns.filter(isTurn) : []
  if (!context || turns.length === 0 || turns.length > TUTOR_LIMITS.maxTurns) return bad(400, 'Conversación inválida')
  if (turns[0].role !== 'user' || turns[turns.length - 1].role !== 'user') return bad(400, 'La conversación debe empezar y terminar con el alumno')

  // La cuenta se revisa después de validar la conversación, para no gastar consultas en pedidos inválidos.
  const account = await checkAccount(request, body.mode === 'free')
  if (account instanceof Response) return account

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
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(account.remaining !== null ? { 'X-Tutor-Remaining': String(account.remaining) } : {}),
    },
  })
}
