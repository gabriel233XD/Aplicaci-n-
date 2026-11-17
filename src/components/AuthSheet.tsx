import { AnimatePresence, motion } from 'framer-motion'
import { Crown, LogOut, Mail, UserRound, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { authErrorMessage, useAuth } from '../lib/auth'
import { socialProviders, type SocialProvider } from '../lib/supabase'
import { SocialButtons } from './SocialButtons'
import { tap } from '../lib/ui-helpers'

type Mode = 'signin' | 'signup' | 'reset'

type Props = {
  /** Por qué se pide la cuenta (por ejemplo "para competir en el ranking"). */
  reason?: string
  /** Pestaña con la que abre: crear cuenta (por defecto) o iniciar sesión. */
  initialMode?: 'signin' | 'signup'
  onClose: () => void
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      className="tutor-backdrop auth-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
    >
      <motion.div
        className="auth-sheet"
        role="dialog"
        aria-label={title}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="auth-head">
          <h2>{title}</h2>
          <motion.button whileTap={tap} className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={22} />
          </motion.button>
        </header>
        <div className="auth-body">{children}</div>
      </motion.div>
    </motion.div>
  )
}

/** Inicio de sesión y registro. */
export function AuthSheet({ reason, initialMode = 'signup', onClose }: Props) {
  const auth = useAuth()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [alias, setAlias] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    if (mode === 'signup') {
      if (alias.trim().length < 3 || alias.trim().length > 20) return setError('Tu apodo debe tener entre 3 y 20 caracteres.')
      if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
      if (!consent) return setError('Marca la casilla de permiso para continuar.')
    }
    setBusy(true)
    try {
      if (mode === 'signin') {
        await auth.signIn(email, password)
        onClose()
      } else if (mode === 'signup') {
        const { needsConfirmation } = await auth.signUp(email, password, alias)
        if (needsConfirmation) setNotice(`Te enviamos un correo a ${email.trim()}. Ábrelo y toca el enlace para activar tu cuenta.`)
        else onClose()
      } else {
        await auth.sendPasswordReset(email)
        setNotice('Si ese correo tiene una cuenta, te llegará un enlace para crear una nueva contraseña.')
      }
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function social(provider: SocialProvider) {
    setError(null)
    if (mode === 'signup' && !consent) return setError('Marca la casilla de permiso para continuar.')
    setBusy(true)
    try {
      await auth.signInWithProvider(provider) // la página se va a Google, Facebook o X
    } catch (err) {
      setError(authErrorMessage(err))
      setBusy(false)
    }
  }

  const consentBox = (
    <label className="check" htmlFor="auth-consent">
      <input id="auth-consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
      <span>Tengo 14 años o más, o mi mamá, papá o apoderado me dio permiso para crear esta cuenta.</span>
    </label>
  )
  const hasSocial = socialProviders.length > 0 && mode !== 'reset'

  const title = mode === 'signin' ? 'Inicia sesión' : mode === 'signup' ? 'Crea tu cuenta' : 'Recupera tu contraseña'

  return (
    <Sheet title={title} onClose={onClose}>
      {reason && mode !== 'reset' && <p className="auth-reason">{reason}</p>}

      {mode !== 'reset' && (
        <div className="segmented two" role="tablist">
          {(['signup', 'signin'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              className={`seg ${mode === m ? 'active' : ''}`}
              onClick={() => {
                setMode(m)
                setError(null)
                setNotice(null)
              }}
            >
              {mode === m && <span className="seg-sel" />}
              <strong>{m === 'signup' ? 'Soy nuevo' : 'Ya tengo cuenta'}</strong>
            </button>
          ))}
        </div>
      )}

      {mode === 'signup' && consentBox}

      {hasSocial && (
        <>
          <SocialButtons disabled={busy} verb={mode === 'signup' ? 'Regístrate con' : 'Continúa con'} onPick={social} />
          <div className="divider">
            <span>o con tu correo</span>
          </div>
        </>
      )}

      <form className="auth-form" onSubmit={submit} noValidate>
        {mode === 'signup' && (
          <div className="field">
            <label htmlFor="auth-alias">Apodo para el ranking</label>
            <input
              id="auth-alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Ej: LeonDeIca"
              maxLength={20}
              autoComplete="nickname"
            />
            <span className="hint-text">Es lo que verán los demás. No uses tu nombre completo.</span>
          </div>
        )}
        <div className="field">
          <label htmlFor="auth-email">Correo</label>
          <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@gmail.com" autoComplete="email" inputMode="email" />
        </div>
        {mode !== 'reset' && (
          <div className="field">
            <label htmlFor="auth-password">Contraseña</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </div>
        )}

        <AnimatePresence>
          {error && (
            <motion.p className="form-error" role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {error}
            </motion.p>
          )}
          {notice && (
            <motion.p className="form-notice" role="status" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Mail size={18} /> {notice}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button whileTap={tap} type="submit" className="btn btn-primary big full" disabled={busy}>
          {busy ? 'Un momento…' : mode === 'signin' ? 'Entrar' : mode === 'signup' ? 'Crear mi cuenta' : 'Enviar enlace'}
        </motion.button>
      </form>

      <div className="auth-links">
        {mode === 'signin' && (
          <button className="link" onClick={() => setMode('reset')}>
            ¿Olvidaste tu contraseña?
          </button>
        )}
        {mode === 'reset' && (
          <button className="link" onClick={() => setMode('signin')}>
            Volver a iniciar sesión
          </button>
        )}
      </div>
    </Sheet>
  )
}

/** Pantalla para elegir una contraseña nueva (después del enlace del correo). */
export function NewPasswordSheet() {
  const auth = useAuth()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    setBusy(true)
    try {
      await auth.setNewPassword(password)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="Elige una contraseña nueva" onClose={auth.cancelRecovery}>
      <form className="auth-form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="new-password">Contraseña nueva</label>
          <input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <motion.button whileTap={tap} type="submit" className="btn btn-primary big full" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar contraseña'}
        </motion.button>
      </form>
    </Sheet>
  )
}

/** "Mi cuenta": apodo, plan y cerrar sesión. */
export function AccountSheet({ onClose }: { onClose: () => void }) {
  const auth = useAuth()
  const [alias, setAlias] = useState(auth.profile?.alias ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function saveAlias(e: FormEvent) {
    e.preventDefault()
    if (alias.trim().length < 3 || alias.trim().length > 20) return setMessage({ ok: false, text: 'Tu apodo debe tener entre 3 y 20 caracteres.' })
    setBusy(true)
    try {
      await auth.updateAlias(alias)
      setMessage({ ok: true, text: 'Apodo guardado.' })
    } catch (err) {
      setMessage({ ok: false, text: authErrorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="Mi cuenta" onClose={onClose}>
      <div className="account-card">
        <span className="account-avatar" aria-hidden="true">
          <UserRound size={28} />
        </span>
        <div>
          <strong>{auth.profile?.alias ?? '…'}</strong>
          <span className="muted small">{auth.session?.user.email}</span>
        </div>
      </div>

      <div className={`plan ${auth.profile?.premium ? 'premium-on' : ''}`}>
        <Crown size={20} />
        <span>
          {auth.profile?.premium ? (
            <>
              <strong>Premium activo</strong> · Tutor IA: 10 consultas al día
            </>
          ) : (
            <>
              <strong>Plan gratis</strong> · Tutor IA: 3 consultas al día. Premium (S/ 5 al mes): próximamente.
            </>
          )}
        </span>
      </div>

      <form className="auth-form" onSubmit={saveAlias} noValidate>
        <div className="field">
          <label htmlFor="account-alias">Apodo para el ranking</label>
          <input id="account-alias" value={alias} onChange={(e) => setAlias(e.target.value)} maxLength={20} autoComplete="nickname" />
        </div>
        {message && (
          <p className={message.ok ? 'form-notice' : 'form-error'} role="status">
            {message.text}
          </p>
        )}
        <motion.button whileTap={tap} type="submit" className="btn btn-ghost full" disabled={busy || alias.trim() === auth.profile?.alias}>
          Guardar apodo
        </motion.button>
      </form>

      <motion.button
        whileTap={tap}
        className="btn btn-ghost full danger"
        onClick={async () => {
          await auth.signOut()
          onClose()
        }}
      >
        <LogOut size={18} /> Cerrar sesión
      </motion.button>
    </Sheet>
  )
}

/** Tras registrarse con Google, Facebook o X: el alumno elige su apodo para el ranking. */
export function ChooseAliasSheet({ onClose }: { onClose: () => void }) {
  const auth = useAuth()
  const [alias, setAlias] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (alias.trim().length < 3 || alias.trim().length > 20) return setError('Tu apodo debe tener entre 3 y 20 caracteres.')
    setBusy(true)
    try {
      await auth.updateAlias(alias)
      onClose()
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="¡Bienvenido! Elige tu apodo" onClose={onClose}>
      <p className="muted">Así te verán los demás en el ranking de Ica. No uses tu nombre completo.</p>
      <form className="auth-form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="choose-alias">Apodo para el ranking</label>
          <input id="choose-alias" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Ej: LeonDeIca" maxLength={20} autoComplete="nickname" />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <motion.button whileTap={tap} type="submit" className="btn btn-primary big full" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar apodo'}
        </motion.button>
      </form>
      <button className="link guest-link" onClick={onClose}>
        Ahora no (te llamaremos {auth.profile?.alias})
      </button>
    </Sheet>
  )
}
