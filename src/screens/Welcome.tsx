import { GraduationCap, MessageCircleQuestion, Smartphone, Trophy } from 'lucide-react'
import { motion } from 'framer-motion'
import { Screen } from '../ui'
import { itemVariants, listVariants, tap } from '../lib/ui-helpers'
import { Dunes } from './ExamPicker'

type Props = {
  onSignUp: () => void
  onSignIn: () => void
  onGuest: () => void
}

const BENEFITS = [
  { icon: Smartphone, text: 'Tu progreso y tus monedas se guardan aunque cambies de celular' },
  { icon: Trophy, text: 'Compite cada domingo en el ranking de Ica' },
  { icon: MessageCircleQuestion, text: 'Pregúntale al tutor IA cuando no entiendas algo' },
]

/** Primera pantalla (con cuentas activadas): iniciar sesión antes de elegir el examen. */
export function Welcome({ onSignUp, onSignIn, onGuest }: Props) {
  return (
    <Screen>
      <header className="hero">
        <Dunes />
        <motion.div
          className="hero-mark"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
        >
          <GraduationCap size={56} strokeWidth={2} />
        </motion.div>
        <motion.h1 className="hero-title" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          Ingresa<span>Ya</span>
        </motion.h1>
        <motion.p className="hero-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          Prepárate para la universidad jugando.
        </motion.p>
      </header>

      <motion.div className="stack" variants={listVariants} initial="hidden" animate="show">
        <motion.ul variants={itemVariants} className="card benefits">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text}>
              <span className="benefit-icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              {text}
            </li>
          ))}
        </motion.ul>

        <motion.button variants={itemVariants} whileTap={tap} className="btn btn-primary big full" onClick={onSignUp}>
          Crear cuenta gratis
        </motion.button>
        <motion.button variants={itemVariants} whileTap={tap} className="btn btn-ghost big full" onClick={onSignIn}>
          Ya tengo cuenta
        </motion.button>
        <motion.button variants={itemVariants} className="link guest-link" onClick={onGuest}>
          Continuar sin cuenta
        </motion.button>
      </motion.div>
    </Screen>
  )
}
