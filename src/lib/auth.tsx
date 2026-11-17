import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { accountsEnabled, supabase, type SocialProvider } from './supabase'

export type Profile = { alias: string; premium: boolean }

type AuthState = {
  enabled: boolean
  loading: boolean
  session: Session | null
  userId: string | null
  profile: Profile | null
  /** El alumno abrió el enlace de "olvidé mi contraseña" y debe elegir una nueva. */
  recovering: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, alias: string) => Promise<{ needsConfirmation: boolean }>
  signInWithProvider: (provider: SocialProvider) => Promise<void>
  /** Error al volver de Google, Facebook o X (por ejemplo, si el alumno canceló). */
  oauthError: string | null
  clearOauthError: () => void
  sendPasswordReset: (email: string) => Promise<void>
  setNewPassword: (password: string) => Promise<void>
  cancelRecovery: () => void
  updateAlias: (alias: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

/** Traduce los errores de Supabase a mensajes claros para el alumno. */
// eslint-disable-next-line react-refresh/only-export-components
export function authErrorMessage(e: unknown): string {
  const err = e as { message?: string; code?: string; status?: number }
  const msg = (err.message ?? '').toLowerCase()
  const code = err.code ?? ''
  if (code === 'invalid_credentials' || msg.includes('invalid login')) return 'Correo o contraseña incorrectos.'
  if (code === 'email_not_confirmed' || msg.includes('not confirmed')) return 'Primero confirma tu correo: revisa tu bandeja de entrada (y spam).'
  if (code === 'user_already_exists' || msg.includes('already registered')) return 'Ese correo ya tiene una cuenta. Inicia sesión.'
  if (code === 'weak_password' || msg.includes('password should')) return 'La contraseña debe tener al menos 8 caracteres.'
  if (code === 'over_email_send_rate_limit' || err.status === 429) return 'Demasiados intentos. Espera unos minutos y vuelve a intentar.'
  if (code === '23505' || msg.includes('duplicate')) return 'Ese apodo ya está en uso. Prueba con otro.'
  if (msg.includes('fetch') || msg.includes('network')) return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'
  return 'Algo salió mal. Inténtalo de nuevo.'
}

/** Si la red social devolvió un error en la dirección, lo traduce y limpia la dirección. */
function readOauthError(): string | null {
  try {
    const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search)
    const error = params.get('error')
    if (!error) return null
    window.history.replaceState(null, '', window.location.pathname)
    if (error === 'access_denied') return 'Cancelaste el inicio de sesión. Puedes intentarlo de nuevo cuando quieras.'
    return 'No se pudo iniciar sesión con esa red social. Prueba de nuevo o usa tu correo.'
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(accountsEnabled)
  const [recovering, setRecovering] = useState(false)
  const [oauthError, setOauthError] = useState<string | null>(() => readOauthError())
  const userId = session?.user.id ?? null

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const loadProfile = useCallback(async () => {
    if (!supabase || !userId) {
      setProfile(null)
      return
    }
    const { data } = await supabase.from('profiles').select('alias, premium_until').eq('id', userId).maybeSingle()
    if (data) setProfile({ alias: data.alias, premium: !!data.premium_until && new Date(data.premium_until) > new Date() })
  }, [userId])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const value = useMemo<AuthState>(
    () => ({
      enabled: accountsEnabled,
      loading,
      session,
      userId,
      profile,
      recovering,
      async signIn(email, password) {
        const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      },
      async signUp(email, password, alias) {
        const { data, error } = await supabase!.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { alias: alias.trim() }, emailRedirectTo: window.location.origin },
        })
        if (error) throw error
        // Con confirmación por correo activada, Supabase no devuelve sesión todavía.
        return { needsConfirmation: !data.session }
      },
      async signInWithProvider(provider) {
        // Lleva al alumno a la página de Google, Facebook o X; al aceptar, vuelve a la app con la sesión iniciada.
        const { error } = await supabase!.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } })
        if (error) throw error
      },
      oauthError,
      clearOauthError() {
        setOauthError(null)
      },
      async sendPasswordReset(email) {
        const { error } = await supabase!.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
        if (error) throw error
      },
      async setNewPassword(password) {
        const { error } = await supabase!.auth.updateUser({ password })
        if (error) throw error
        setRecovering(false)
      },
      cancelRecovery() {
        setRecovering(false)
      },
      async updateAlias(alias) {
        const { error } = await supabase!.from('profiles').update({ alias: alias.trim() }).eq('id', userId!)
        if (error) throw error
        await loadProfile()
      },
      async signOut() {
        await supabase!.auth.signOut()
        setProfile(null)
      },
    }),
    [loading, session, userId, profile, recovering, oauthError, loadProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
