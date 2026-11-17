import { AnimatePresence, motion } from 'framer-motion'
import { Award, Coins, X } from 'lucide-react'

export type Toast = { id: number; kind: 'achievement' | 'coins'; title: string; text: string }

/** Avisos flotantes arriba de la pantalla (logros nuevos, monedas ganadas). */
export function Toasts({ toasts, onClose }: { toasts: Toast[]; onClose: (id: number) => void }) {
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {toasts.slice(0, 3).map((t) => (
          <motion.div
            key={t.id}
            layout
            className={`toast ${t.kind}`}
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          >
            <span className="toast-icon" aria-hidden="true">
              {t.kind === 'achievement' ? <Award size={22} /> : <Coins size={22} />}
            </span>
            <span className="toast-text">
              <strong>{t.title}</strong>
              <span>{t.text}</span>
            </span>
            <button className="toast-close" onClick={() => onClose(t.id)} aria-label="Cerrar aviso">
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
