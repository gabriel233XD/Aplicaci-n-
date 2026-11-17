import { Check, Flame, GraduationCap, Lightbulb, Sparkles, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { ShownQuestion } from '../types'
import { TutorPanel } from '../components/TutorPanel'
import { CourseIcon, Screen } from '../ui'
import { courseStyle, tap } from '../lib/ui-helpers'

export type PracticeAnswer = { chosen: number; usedHint: boolean }

type Props = {
  questions: ShownQuestion[]
  onFinish: (answers: PracticeAnswer[]) => void
  onQuit: () => void
}

const LETTERS = ['A', 'B', 'C', 'D', 'E']

export function Practice({ questions, onFinish, onQuit }: Props) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<PracticeAnswer[]>([])
  const [chosen, setChosen] = useState<number | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [combo, setCombo] = useState(0)
  const [tutorOpen, setTutorOpen] = useState(false)

  const { question, order } = questions[index]

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [index])
  const answered = chosen !== null
  const isCorrect = chosen === question.answer
  const last = index + 1 >= questions.length

  function choose(original: number) {
    if (answered) return
    setChosen(original)
    try {
      navigator.vibrate?.(original === question.answer ? 15 : [30, 40, 30])
    } catch {
      // Sin vibración disponible: no pasa nada.
    }
    setCombo(original === question.answer ? combo + 1 : 0)
  }

  function next() {
    const all = [...answers, { chosen: chosen!, usedHint: showHint }]
    if (last) {
      onFinish(all)
      return
    }
    setAnswers(all)
    setIndex(index + 1)
    setChosen(null)
    setShowHint(false)
    setTutorOpen(false)
  }

  return (
    <Screen className="quiz" style={courseStyle(question.course)}>
      <header className="topbar">
        <motion.button className="link" whileTap={tap} onClick={onQuit}><X size={18} strokeWidth={2.6} /> Salir</motion.button>
        <div className="quiz-meta">
          <AnimatePresence>
            {combo >= 2 && (
              <motion.span
                key={combo}
                className="combo"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 14 }}
              >
                <Flame size={15} strokeWidth={2.6} /> x{combo}
              </motion.span>
            )}
          </AnimatePresence>
          <span className="muted small tabular">
            {index + 1} / {questions.length}
          </span>
        </div>
      </header>

      <div className="progress-bar">
        <motion.div
          animate={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 26 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className="stack"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ type: 'spring', stiffness: 360, damping: 34 }}
        >
          <div className="q-course">
            <CourseIcon course={question.course} size="sm" />
            <span>
              {question.course} · {question.topic}
            </span>
          </div>
          <h2 className="statement">{question.statement}</h2>

          <div className="stack-sm">
            {order.map((orig, pos) => {
              const isAnswer = orig === question.answer
              const isPicked = orig === chosen
              let cls = 'option'
              if (answered && isAnswer) cls += ' correct'
              else if (answered && isPicked) cls += ' wrong'
              else if (answered) cls += ' dim'
              return (
                <motion.button
                  key={orig}
                  className={cls}
                  onClick={() => choose(orig)}
                  disabled={answered}
                  initial={{ opacity: 0, y: 10 }}
                  animate={
                    answered && isPicked && !isAnswer
                      ? { opacity: 1, y: 0, x: [0, -10, 10, -7, 7, -3, 0] }
                      : answered && isAnswer
                        ? { opacity: 1, y: 0, scale: [1, 1.04, 1] }
                        : { opacity: 1, y: 0 }
                  }
                  transition={answered ? { duration: 0.45 } : { delay: 0.05 + pos * 0.05 }}
                  whileTap={answered ? undefined : tap}
                >
                  <span className="letter">{answered && isAnswer ? <Check size={18} strokeWidth={3} /> : answered && isPicked ? <X size={18} strokeWidth={3} /> : LETTERS[pos]}</span>
                  <span>{question.options[orig]}</span>
                  {answered && isAnswer && isPicked && !showHint && (
                    <motion.span
                      className="float-coin"
                      initial={{ opacity: 0, y: 0 }}
                      animate={{ opacity: [0, 1, 1, 0], y: -46 }}
                      transition={{ duration: 1.1 }}
                    >
                      +1 <span className="coin" aria-hidden="true" />
                    </motion.span>
                  )}
                </motion.button>
              )
            })}
          </div>

          <AnimatePresence initial={false}>
            {!answered && !showHint && (
              <motion.button
                key="hint-btn"
                className="btn btn-ghost full"
                whileTap={tap}
                exit={{ opacity: 0, height: 0 }}
                onClick={() => setShowHint(true)}
              >
                <Lightbulb size={18} /> Ver pista <span className="muted small">(esta pregunta no dará moneda)</span>
              </motion.button>
            )}
            {showHint && !answered && (
              <motion.div
                key="hint"
                className="hint"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="hint-inner"><Lightbulb size={20} className="hint-ico" /> <span>{question.hint}</span></div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {answered && (
          <motion.div
            key={`fb-${index}`}
            className={`sheet ${isCorrect ? 'ok' : 'bad'}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          >
            <div className="sheet-inner">
              <strong className="sheet-title">{isCorrect ? <><Sparkles size={22} /> ¡Correcto!</> : 'Casi… revisa la explicación'}</strong>
              <p>{question.explanation}</p>
              <motion.button whileTap={tap} className="btn btn-tutor full" onClick={() => setTutorOpen(true)}>
                <GraduationCap size={20} />
                {isCorrect ? 'Profundiza con el tutor IA' : '¿No entendiste? Pregúntale al tutor IA'}
              </motion.button>
              <motion.button whileTap={tap} className={`btn big full ${isCorrect ? 'btn-ok' : 'btn-bad'}`} onClick={next}>
                {last ? 'Ver resultados' : 'Siguiente →'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {tutorOpen && answered && (
          <TutorPanel key={`tutor-${index}`} question={question} chosen={chosen} onClose={() => setTutorOpen(false)} />
        )}
      </AnimatePresence>
    </Screen>
  )
}
