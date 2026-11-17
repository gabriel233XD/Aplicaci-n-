import { motion } from 'framer-motion'
import { Clock, Hourglass, Share2, Swords, Trophy } from 'lucide-react'
import { useState } from 'react'
import { Screen } from '../ui'
import { itemVariants, listVariants, tap } from '../lib/ui-helpers'
import { appUrl, shareOrCopy, whatsappUrl } from '../lib/share'
import { duelOutcome, seconds, type Duel } from '../lib/duel'

/** Pantalla para aceptar un reto que llegó por enlace. */
export function DuelInvite({ duel, onAccept, onBack }: { duel: Duel; onAccept: () => void; onBack: () => void }) {
  const total = duel.questionIds.length
  return (
    <Screen>
      <motion.div className="stack" variants={listVariants} initial="hidden" animate="show">
        <motion.section variants={itemVariants} className="event duel-hero">
          <div className="event-glow" aria-hidden="true" />
          <span className="duel-icon" aria-hidden="true">
            <Swords size={40} />
          </span>
          <div className="event-tag">DUELO 1 VS 1</div>
          <h1 className="event-title">¡{duel.creator.alias} te reta!</h1>
          <p className="event-note">
            Acertó <strong>{duel.creator.correct} de {total}</strong> en <strong>{seconds(duel.creator.ms)}</strong>. Responde las mismas {total} preguntas: gana quien acierte más, y si empatan, el más rápido.
          </p>
        </motion.section>
        {duel.expired ? (
          <motion.p variants={itemVariants} className="form-error">Este duelo ya venció (duran 7 días).</motion.p>
        ) : (
          <motion.button variants={itemVariants} whileTap={tap} className="btn btn-primary big full" onClick={onAccept}>
            <Swords size={20} /> ¡Acepto el reto!
          </motion.button>
        )}
        <motion.button variants={itemVariants} whileTap={tap} className="btn btn-ghost full" onClick={onBack}>
          Ahora no
        </motion.button>
      </motion.div>
    </Screen>
  )
}

/** Resultado de un duelo (o espera del rival, con el enlace para compartir). */
export function DuelResult({ duel, onHome, onNewDuel }: { duel: Duel; onHome: () => void; onNewDuel: () => void }) {
  const outcome = duelOutcome(duel)
  const total = duel.questionIds.length
  const link = appUrl({ duelo: duel.id })
  const text = `⚔️ Te reto a un duelo en IngresaYa: acerté ${duel.creator.correct} de ${total} en ${seconds(duel.creator.ms)}. ¿Me ganas?`
  const [copied, setCopied] = useState(false)
  const title =
    outcome === 'waiting' ? '¡Reto creado!' : outcome === 'win' ? '¡Ganaste el duelo! 🏆' : outcome === 'lose' ? 'Esta vez perdiste' : '¡Empate perfecto!'

  const row = (who: { alias: string; correct: number; ms: number } | null, label: string, isMe: boolean) => (
    <div className={`duel-player ${isMe ? 'me' : ''}`}>
      <span className="muted tiny">{label}</span>
      <strong>{who ? who.alias : '¿Quién será?'}</strong>
      {who ? (
        <span className="duel-score tabular">
          <Trophy size={16} /> {who.correct}/{total} <Clock size={16} /> {seconds(who.ms)}
        </span>
      ) : (
        <span className="duel-score muted">
          <Hourglass size={16} /> Esperando rival
        </span>
      )}
    </div>
  )

  return (
    <Screen>
      <motion.div className="stack" variants={listVariants} initial="hidden" animate="show">
        <motion.section variants={itemVariants} className={`event duel-hero ${outcome}`}>
          <div className="event-glow" aria-hidden="true" />
          <div className="event-tag">DUELO 1 VS 1</div>
          <h1 className="event-title">{title}</h1>
          <div className="duel-vs">
            {row(duel.creator, duel.role === 'creator' ? 'Tú' : 'Retador', duel.role === 'creator')}
            <span className="vs" aria-hidden="true">VS</span>
            {row(duel.opponent, duel.role === 'opponent' ? 'Tú' : 'Rival', duel.role === 'opponent')}
          </div>
        </motion.section>

        {outcome === 'waiting' && duel.role === 'creator' && (
          <motion.section variants={itemVariants} className="card stack-sm">
            <h3>Envía el reto a un amigo</h3>
            <p className="muted small">Tu amigo responderá las mismas {total} preguntas. El reto dura 7 días.</p>
            <a className="btn btn-whatsapp big full" href={whatsappUrl(`${text} ${link}`)} target="_blank" rel="noreferrer">
              Retar por WhatsApp
            </a>
            <motion.button
              whileTap={tap}
              className="btn btn-ghost full"
              onClick={async () => setCopied((await shareOrCopy(text, link)) === 'copied')}
            >
              <Share2 size={18} /> Compartir enlace
            </motion.button>
            {copied && <p className="form-notice">Enlace copiado ✅</p>}
          </motion.section>
        )}

        <motion.div variants={itemVariants} className="nav-row">
          <motion.button whileTap={tap} className="btn btn-ghost" onClick={onHome}>
            Inicio
          </motion.button>
          <motion.button whileTap={tap} className="btn btn-primary" onClick={onNewDuel}>
            <Swords size={18} /> Nuevo duelo
          </motion.button>
        </motion.div>
      </motion.div>
    </Screen>
  )
}
