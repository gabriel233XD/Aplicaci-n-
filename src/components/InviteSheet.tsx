import { AnimatePresence, motion } from 'framer-motion'
import { Copy, Gift, Share2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { appUrl, shareOrCopy, whatsappUrl } from '../lib/share'
import { tap } from '../lib/ui-helpers'

/** Invitar amigos: +50 monedas para cada uno cuando el amigo se registra con tu enlace. */
export function InviteSheet({ onClose }: { onClose: () => void }) {
  const auth = useAuth()
  const code = auth.profile?.referralCode
  const [count, setCount] = useState<number | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const link = code ? appUrl({ ref: code }) : ''
  const text = `🎓 Prepárate para el examen de admisión jugando con IngresaYa. Regístrate con mi enlace y los dos ganamos 50 monedas 🪙:`

  useEffect(() => {
    if (!supabase || !code) return
    void supabase.rpc('my_referrals').then(({ data }) => setCount(typeof data === 'number' ? data : 0))
  }, [code])

  return (
    <motion.div className="tutor-backdrop auth-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="auth-sheet"
        role="dialog"
        aria-label="Invita a tus amigos"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="auth-head">
          <h2>Invita a tus amigos</h2>
          <motion.button whileTap={tap} className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={22} />
          </motion.button>
        </header>
        <div className="auth-body">
          <div className="invite-hero">
            <span className="invite-gift" aria-hidden="true">
              <Gift size={32} />
            </span>
            <p>
              Por cada amigo que se registre con tu enlace, <strong>tú y tu amigo ganan 50 monedas</strong> 🪙
            </p>
          </div>

          {!code ? (
            <p className="form-error">Las invitaciones se activarán pronto.</p>
          ) : (
            <>
              <div className="code-box">
                <span className="muted small">Tu código</span>
                <strong className="tabular">{code}</strong>
              </div>
              <a className="btn btn-whatsapp big full" href={whatsappUrl(`${text} ${link}`)} target="_blank" rel="noreferrer">
                Invitar por WhatsApp
              </a>
              <div className="nav-row">
                <motion.button
                  whileTap={tap}
                  className="btn btn-ghost"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(link)
                      setMsg('Enlace copiado ✅')
                    } catch {
                      setMsg(link)
                    }
                  }}
                >
                  <Copy size={18} /> Copiar enlace
                </motion.button>
                <motion.button
                  whileTap={tap}
                  className="btn btn-ghost"
                  onClick={async () => {
                    const r = await shareOrCopy(text, link)
                    if (r === 'copied') setMsg('Enlace copiado ✅')
                  }}
                >
                  <Share2 size={18} /> Compartir
                </motion.button>
              </div>
              <AnimatePresence>
                {msg && (
                  <motion.p className="form-notice selectable" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {msg}
                  </motion.p>
                )}
              </AnimatePresence>
              {count !== null && (
                <p className="muted small center">
                  {count === 0 ? 'Todavía no has invitado a nadie.' : `Has invitado a ${count} ${count === 1 ? 'amigo' : 'amigos'} 🎉`} (máximo 30)
                </p>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
