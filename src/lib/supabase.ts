import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Las cuentas se activan cuando existen estas dos variables (archivo .env o Vercel).
// Sin ellas la app funciona en "modo invitado": el progreso queda solo en el celular.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null

export const accountsEnabled = supabase !== null

/** Botón "Continuar con Google": solo si se configuró en Supabase. */
export const googleEnabled = import.meta.env.VITE_AUTH_GOOGLE === 'true'

export type RankingEntry = { position: number; alias: string; score: number; isMe: boolean }
export type Ranking = {
  participants: number
  me: { position: number; score: number } | null
  top: RankingEntry[]
}
