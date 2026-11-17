import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Las cuentas se activan cuando existen estas dos variables (archivo .env o Vercel).
// Sin ellas la app funciona en "modo invitado": el progreso queda solo en el celular.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null

export const accountsEnabled = supabase !== null

/** Redes sociales para registrarse. Solo aparecen las que se activaron en Supabase. */
export type SocialProvider = 'google' | 'facebook' | 'x'

const SOCIAL: SocialProvider[] = ['google', 'facebook', 'x']
const providersSetting =
  (import.meta.env.VITE_AUTH_PROVIDERS as string | undefined) ?? (import.meta.env.VITE_AUTH_GOOGLE === 'true' ? 'google' : '')

/** Ej: VITE_AUTH_PROVIDERS=google,facebook,x */
export const socialProviders: SocialProvider[] = SOCIAL.filter((p) =>
  providersSetting
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .includes(p),
)

export type RankingEntry = { position: number; alias: string; score: number; isMe: boolean }
export type Ranking = {
  participants: number
  me: { position: number; score: number } | null
  top: RankingEntry[]
}
