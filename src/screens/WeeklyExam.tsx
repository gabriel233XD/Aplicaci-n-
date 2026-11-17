import { LayoutGrid, Timer } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { CourseIcon, Screen } from '../ui'
import { courseStyle, tap } from '../lib/ui-helpers'
import type { ShownQuestion } from '../types'

type Props = {
  questions: ShownQuestion[]
  minutes: number
  onFinish: (answers: (number | null)[]) => void
}

const LETTERS = ['A', 'B', 'C', 'D', 'E']

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function WeeklyExam({ questions, minutes, onFinish }: Props) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null))
  const [index, setIndex] = useState(0)
  const [showGrid, setShowGrid] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const endAt = useRef(Date.now() + minutes * 60_000)
  const [left, setLeft] = useState(minutes * 60)
  const answersRef = useRef(answers)
  answersRef.current = answers
  const finished = useRef(false)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  useEffect(() => {
    const id = setInterval(() => {
      const sec = Math.max(0, Math.round((endAt.current - Date.now()) / 1000))
      setLeft(sec)
      if (sec === 0 && !finished.current) {
        finished.current = true
        onFinishRef.current(answersRef.current)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const { question, order } = questions[index]

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [index])
  const answeredCount = answers.filter((a) => a !== null).length

  function choose(orig: number) {
    setAnswers((prev) => prev.map((a, i) => (i === index ? orig : a)))
  }

  const missing = questions.length - answeredCount

  function finish() {
    if (finished.current) return
    finished.current = true
    onFinish(answers)
  }

  const timePct = (left / (minutes * 60)) * 100

  return (
    <Screen className="quiz" style={courseStyle(question.course)}>
      <header className="topbar exam-bar">
        <span className={`timer ${left < 600 ? 'urgent' : ''}`}>
          <motion.span animate={left < 600 ? { scale: [1, 1.15, 1] } : {}} transition={{ duration: 1, repeat: Infinity }} className="timer-ico"><Timer size={20} strokeWidth={2.6} /></motion.span>{' '}
          {formatTime(left)}
        </span>
        <motion.button className="pill grid-toggle" whileTap={tap} onClick={() => setShowGrid(!showGrid)} aria-expanded={showGrid} aria-label="Ver todas las preguntas">
          <LayoutGrid size={16} /> {answeredCount}/{questions.length}
        </motion.button>
      </header>
      <div className="progress-bar thin">
        <motion.div className="time-fill" animate={{ width: `${timePct}%` }} transition={{ duration: 1, ease: 'linear' }} />
      </div>

      <AnimatePresence initial={false}>
        {showGrid && (
          <motion.div
            className="grid-wrap"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="grid">
              {questions.map((_, i) => (
                <button
                  key={i}
                  className={`cell ${answers[i] !== null ? 'done' : ''} ${i === index ? 'current' : ''}`}
                  onClick={() => {
                    setIndex(i)
                    setShowGrid(false)
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className="stack"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        >
          <div className="q-course">
            <CourseIcon course={question.course} size="sm" />
            <span>
              Pregunta {index + 1} · {question.course}
            </span>
          </div>
          <h2 className="statement">{question.statement}</h2>

          <div className="stack-sm">
            {order.map((orig, pos) => {
              const sel = answers[index] === orig
              return (
                <motion.button
                  key={orig}
                  whileTap={tap}
                  animate={sel ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className={`option ${sel ? 'selected' : ''}`}
                  onClick={() => choose(orig)}
                >
                  <span className="letter">{LETTERS[pos]}</span>
                  <span>{question.options[orig]}</span>
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="nav-row">
        <motion.button whileTap={tap} className="btn btn-ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          ← Anterior
        </motion.button>
        {index + 1 < questions.length ? (
          <motion.button whileTap={tap} className="btn btn-primary" onClick={() => setIndex(index + 1)}>
            Siguiente →
          </motion.button>
        ) : (
          <motion.button whileTap={tap} className="btn btn-primary" onClick={() => setConfirming(true)}>
            Terminar
          </motion.button>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {confirming ? (
          <motion.div
            key="confirm"
            className="card confirm-box"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <strong>
              {missing > 0 ? `Te faltan ${missing} preguntas. ¿Entregar el examen igual?` : '¿Entregar el examen?'}
            </strong>
            <div className="nav-row">
              <motion.button whileTap={tap} className="btn btn-ghost" onClick={() => setConfirming(false)}>
                Seguir respondiendo
              </motion.button>
              <motion.button whileTap={tap} className="btn btn-primary" onClick={finish}>
                Sí, entregar
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.button key="deliver" whileTap={tap} className="btn btn-ghost full" onClick={() => setConfirming(true)}>
            Entregar examen
          </motion.button>
        )}
      </AnimatePresence>
    </Screen>
  )
}
