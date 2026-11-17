import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { socialProviders, type SocialProvider } from '../lib/supabase'
import { tap } from '../lib/ui-helpers'

// Logotipos oficiales (solo para los botones de inicio de sesión).
const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81Z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.93-2.92l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A11.99 11.99 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.29 14.28A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.38-2.28v-3.1H1.29A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.29 5.38l4-3.1Z" />
    <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l4 3.1C6.23 6.88 8.88 4.77 12 4.77Z" />
  </svg>
)

const FacebookLogo = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      fill="currentColor"
      d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.23 2.68.23v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z"
    />
  </svg>
)

const XLogo = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path
      fill="currentColor"
      d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z"
    />
  </svg>
)

const META: Record<SocialProvider, { label: string; logo: () => ReactNode }> = {
  google: { label: 'Google', logo: GoogleLogo },
  facebook: { label: 'Facebook', logo: FacebookLogo },
  x: { label: 'X', logo: XLogo },
}

type Props = {
  disabled?: boolean
  /** "Regístrate con" o "Continúa con". */
  verb: string
  onPick: (provider: SocialProvider) => void
}

export function SocialButtons({ disabled, verb, onPick }: Props) {
  if (socialProviders.length === 0) return null
  return (
    <div className="social">
      {socialProviders.map((p) => {
        const { label, logo: Logo } = META[p]
        return (
          <motion.button key={p} type="button" whileTap={tap} className={`btn social-btn social-${p}`} disabled={disabled} onClick={() => onPick(p)}>
            <Logo />
            <span>
              {verb} {label}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
