import { BookOpen, Check, ChevronDown, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import type { ShownQuestion } from '../types'

/** Lista de preguntas con la respuesta del alumno, la correcta y la explicación. */
export function Review({ questions, chosen }: { questions: ShownQuestion[]; chosen: (number | null)[] }) {
  const [onlyWrong, setOnlyWrong] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const items = questions
    .map((sq, i) => ({ ...sq, chosen: chosen[i], n: i + 1 }))
    .filter((it) => !onlyWrong || it.chosen !== it.question.answer)

  return (
    <section className="card">
      <div className="review-head">
        <h3 className="h-icon"><BookOpen size={20} /> Revisión</h3>
        <label className="small switch">
          <input id="only-wrong" type="checkbox" checked={onlyWrong} onChange={() => setOnlyWrong(!onlyWrong)} />
          Solo errores
        </label>
      </div>
      {items.length === 0 && <p className="muted small">¡No tuviste errores!</p>}
      <div className="review-list">
        {items.map(({ question, chosen: c, n }) => {
          const ok = c === question.answer
          const open = openId === question.id
          return (
            <div key={question.id} className={`review-item ${ok ? 'ok' : 'bad'}`}>
              <button className="review-q" onClick={() => setOpenId(open ? null : question.id)} aria-expanded={open}>
                <span className="review-mark">{ok ? <Check size={14} strokeWidth={3.2} /> : <X size={14} strokeWidth={3.2} />}</span>
                <span className="review-text">
                  {n}. {question.statement}
                </span>
                <motion.span animate={{ rotate: open ? 180 : 0 }} className="muted chev"><ChevronDown size={18} /></motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="review-body"
                  >
                    <div className="review-inner small">
                      <p>
                        Tu respuesta: <strong>{c === null ? 'Sin responder' : question.options[c]}</strong>
                        <br />
                        Correcta: <strong>{question.options[question.answer]}</strong>
                      </p>
                      <p>{question.explanation}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </section>
  )
}
