import { AnimatePresence, MotionConfig } from 'framer-motion'
import { useCallback, useState, type ReactNode } from 'react'
import { exams } from './data/exams'
import type { ExamConfig, ShownQuestion, WeeklyResult } from './types'
import { RULES, dayKey, pickQuestions, simulatedRanking, weekId } from './lib/game'
import { loadSelectedExam, saveSelectedExam, useProgress } from './lib/storage'
import { useAuth } from './lib/auth'
import { accountsEnabled, supabase, type Ranking } from './lib/supabase'
import { AccountSheet, AuthSheet, ChooseAliasSheet, NewPasswordSheet } from './components/AuthSheet'
import { Screen } from './ui'
import { ExamPicker } from './screens/ExamPicker'
import { Welcome } from './screens/Welcome'
import { Home } from './screens/Home'
import { PracticeSetup } from './screens/PracticeSetup'
import { Practice, type PracticeAnswer } from './screens/Practice'
import { WeeklyExam } from './screens/WeeklyExam'
import { PracticeResult, WeeklyResultView, type PracticeSummary } from './screens/Results'

export default function App() {
  const [examId, setExamId] = useState<string | null>(() => {
    const saved = loadSelectedExam()
    return exams.some((e) => e.id === saved && e.available) ? saved : null
  })

  const pick = (id: string | null) => {
    saveSelectedExam(id)
    setExamId(id)
  }

  const exam = exams.find((e) => e.id === examId)
  const auth = useAuth()
  const [guest, setGuest] = useState(loadGuestChoice)
  const [sheet, setSheet] = useState<null | 'signup' | 'signin' | 'account'>(null)
  // Con cuentas activadas, primero se pide iniciar sesión (o elegir seguir sin cuenta).
  const showWelcome = auth.enabled && !auth.loading && !auth.userId && !guest
  // Quien entra con Google, Facebook o X recibe un apodo automático ("Postulante12345"): se le invita a cambiarlo.
  const [aliasAsked, setAliasAsked] = useState(false)
  const needsAlias = !!auth.profile && /^Postulante\d*$/.test(auth.profile.alias) && !aliasAsked && !auth.recovering
  const chooseGuest = () => {
    saveGuestChoice()
    setGuest(true)
  }

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        {auth.loading ? (
          <Screen key="loading" className="grading">
            <div className="spinner" aria-hidden="true" />
          </Screen>
        ) : showWelcome ? (
          <Welcome
            key="welcome"
            error={auth.oauthError}
            onSignUp={() => {
              auth.clearOauthError()
              setSheet('signup')
            }}
            onSignIn={() => {
              auth.clearOauthError()
              setSheet('signin')
            }}
            onSocial={(provider) => {
              auth.clearOauthError()
              void auth.signInWithProvider(provider)
            }}
            onGuest={chooseGuest}
          />
        ) : exam ? (
          // `key` separa el progreso de cada examen (UNICA, Beca 18, etc.) y de cada cuenta.
          <ExamApp key={`${exam.id}:${auth.userId ?? 'invitado'}`} exam={exam} onChangeExam={() => pick(null)} />
        ) : (
          <ExamPicker key="picker" onPick={pick} onAccount={() => setSheet(auth.userId ? 'account' : 'signin')} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {(sheet === 'signup' || sheet === 'signin') && !auth.userId && (
          <AuthSheet key="auth-root" initialMode={sheet} onClose={() => setSheet(null)} />
        )}
        {sheet === 'account' && auth.userId && <AccountSheet key="account-root" onClose={() => setSheet(null)} />}
      </AnimatePresence>
      <AnimatePresence>{auth.recovering && <NewPasswordSheet key="new-password" />}</AnimatePresence>
      <AnimatePresence>{needsAlias && <ChooseAliasSheet key="choose-alias" onClose={() => setAliasAsked(true)} />}</AnimatePresence>
    </MotionConfig>
  )
}

function loadGuestChoice(): boolean {
  try {
    return localStorage.getItem('ingresaya:guest') === '1'
  } catch {
    return false
  }
}

function saveGuestChoice() {
  try {
    localStorage.setItem('ingresaya:guest', '1')
  } catch {
    // ignorar
  }
}

type View =
  | { name: 'home' }
  | { name: 'setup' }
  | { name: 'practice'; questions: ShownQuestion[]; course: string | null }
  | { name: 'practiceResult'; questions: ShownQuestion[]; chosen: number[]; summary: PracticeSummary; course: string | null }
  | { name: 'weekly'; questions: ShownQuestion[] }
  | { name: 'grading' }
  | { name: 'weeklyResult'; questions: ShownQuestion[]; chosen: (number | null)[]; result: WeeklyResult; previous?: WeeklyResult; bonus: number }

function ExamApp({ exam, onChangeExam }: { exam: ExamConfig; onChangeExam: () => void }) {
  const auth = useAuth()
  const [progress, update, sync] = useProgress(exam.id, auth.userId)
  const [view, setView] = useState<View>({ name: 'home' })
  const [demoMode, setDemoMode] = useState(false)
  const [sheet, setSheet] = useState<null | { kind: 'auth'; reason?: string } | { kind: 'account' }>(null)
  const home = () => setView({ name: 'home' })
  /** Con cuentas activadas, el examen real del domingo exige iniciar sesión. */
  const rankedExam = accountsEnabled && !demoMode

  function startPractice(course: string | null, count: number, topic?: string) {
    const pool = exam.questions.filter((q) => (!course || q.course === course) && (!topic || q.topic === topic))
    setView({ name: 'practice', questions: pickQuestions(pool, count), course })
  }

  function finishPractice(questions: ShownQuestion[], answers: PracticeAnswer[], course: string | null) {
    const correct = answers.filter((a, i) => a.chosen === questions[i].question.answer).length
    const coinsCorrect = answers.filter((a, i) => !a.usedHint && a.chosen === questions[i].question.answer).length * RULES.coinsPerCorrect
    const passBonus = (correct / questions.length) * 100 >= RULES.passPercent ? RULES.passBonus : 0

    const today = dayKey()
    const yesterday = dayKey(new Date(Date.now() - 86_400_000))
    const firstToday = progress.lastPracticeDay !== today
    const streak = !firstToday ? progress.streak : progress.lastPracticeDay === yesterday ? progress.streak + 1 : 1
    const streakBonus = firstToday ? RULES.streakBonus : 0

    update((p) => {
      const topicStats = { ...p.topicStats }
      questions.forEach(({ question }, i) => {
        const s = topicStats[question.topic] ?? { correct: 0, total: 0 }
        topicStats[question.topic] = {
          correct: s.correct + (answers[i].chosen === question.answer ? 1 : 0),
          total: s.total + 1,
        }
      })
      return {
        ...p,
        coins: p.coins + coinsCorrect + passBonus + streakBonus,
        streak,
        lastPracticeDay: today,
        answered: p.answered + questions.length,
        topicStats,
      }
    })

    setView({
      name: 'practiceResult',
      questions,
      chosen: answers.map((a) => a.chosen),
      summary: { correct, total: questions.length, coinsCorrect, passBonus, streakBonus, streak },
      course,
    })
  }

  function startWeekly() {
    if (rankedExam && !auth.userId) {
      setSheet({ kind: 'auth', reason: 'Crea tu cuenta para dar el examen del domingo y aparecer en el ranking de Ica.' })
      return
    }
    if (progress.coins < exam.weekly.entryCost) return
    update((p) => ({ ...p, coins: p.coins - exam.weekly.entryCost }))
    setView({ name: 'weekly', questions: pickQuestions(exam.questions, exam.weekly.questionCount) })
  }

  const finishWeekly = useCallback(
    async (questions: ShownQuestion[], chosen: (number | null)[]) => {
      const correct = chosen.filter((c, i) => c === questions[i].question.answer).length
      const maxScore = questions.length * RULES.pointsPerQuestion
      const score = correct * RULES.pointsPerQuestion
      let ranking: Pick<WeeklyResult, 'position' | 'participants' | 'top' | 'simulated' | 'rankingError'>

      if (rankedExam && auth.userId && supabase) {
        // Ranking real: el servidor guarda el resultado (uno por semana) y devuelve el top 10.
        setView({ name: 'grading' })
        const { data, error } = await supabase.rpc('submit_weekly_result', {
          p_exam_id: exam.id,
          p_score: score,
          p_max_score: maxScore,
          p_correct: correct,
          p_total: questions.length,
        })
        const r = data as Ranking | null
        ranking =
          error || !r?.me
            ? {
                position: 0,
                participants: 0,
                rankingError: error?.code === '23505' ? 'Ya diste el examen de esta semana: este intento no cuenta para el ranking.' : 'No se pudo guardar tu resultado. Revisa tu conexión.',
              }
            : { position: r.me.position, participants: r.participants, top: r.top }
      } else {
        ranking = { ...simulatedRanking(score, maxScore), simulated: true }
      }

      const bonus = score > 0 && ranking.position > 0 && ranking.position <= 10 ? RULES.top10Bonus : 0
      const result: WeeklyResult = {
        weekId: demoMode ? `demo-${Date.now()}` : weekId(),
        date: new Date().toISOString(),
        score,
        maxScore,
        correct,
        totalQuestions: questions.length,
        ...ranking,
      }
      const previous = progress.weeklyResults[progress.weeklyResults.length - 1]

      update((p) => {
        const topicStats = { ...p.topicStats }
        questions.forEach(({ question }, i) => {
          const s = topicStats[question.topic] ?? { correct: 0, total: 0 }
          topicStats[question.topic] = {
            correct: s.correct + (chosen[i] === question.answer ? 1 : 0),
            total: s.total + 1,
          }
        })
        return { ...p, coins: p.coins + bonus, topicStats, weeklyResults: [...p.weeklyResults, result] }
      })
      setView({ name: 'weeklyResult', questions, chosen, result, previous, bonus })
    },
    [demoMode, rankedExam, auth.userId, exam.id, progress.weeklyResults, update],
  )

  return (
    <>
      <AnimatePresence mode="wait">{renderView()}</AnimatePresence>
      <AnimatePresence>
        {sheet?.kind === 'auth' && <AuthSheet key="auth" reason={sheet.reason} onClose={() => setSheet(null)} />}
        {sheet?.kind === 'account' && <AccountSheet key="account" onClose={() => setSheet(null)} />}
      </AnimatePresence>
    </>
  )

  function renderView(): ReactNode {
  switch (view.name) {
    case 'home':
      return (
        <Home
          key="home"
          exam={exam}
          progress={progress}
          demoMode={demoMode}
          onToggleDemo={() => setDemoMode(!demoMode)}
          onPractice={() => setView({ name: 'setup' })}
          onPracticeTopic={(topic) => startPractice(null, 10, topic)}
          onWeekly={startWeekly}
          onChangeExam={onChangeExam}
          sync={sync}
          needsAccountForWeekly={rankedExam && !auth.userId}
          onAccount={() => setSheet(auth.userId ? { kind: 'account' } : { kind: 'auth' })}
        />
      )
    case 'setup':
      return <PracticeSetup key="setup" exam={exam} onBack={home} onStart={(course, count) => startPractice(course, count)} />
    case 'practice':
      return (
        <Practice
          key="practice"
          questions={view.questions}
          onQuit={home}
          onFinish={(answers) => finishPractice(view.questions, answers, view.course)}
        />
      )
    case 'practiceResult':
      return (
        <PracticeResult
          key="practiceResult"
          summary={view.summary}
          questions={view.questions}
          chosen={view.chosen}
          onHome={home}
          onAgain={() => setView({ name: 'setup' })}
        />
      )
    case 'weekly':
      return (
        <WeeklyExam
          key="weekly"
          questions={view.questions}
          minutes={exam.weekly.minutes}
          onFinish={(chosen) => void finishWeekly(view.questions, chosen)}
        />
      )
    case 'grading':
      return (
        <Screen key="grading" className="grading">
          <div className="spinner" aria-hidden="true" />
          <h2>Calificando tu examen…</h2>
          <p className="muted">Calculando tu puesto en el ranking de Ica.</p>
        </Screen>
      )
    case 'weeklyResult':
      return (
        <WeeklyResultView
          key="weeklyResult"
          result={view.result}
          previous={view.previous}
          bonus={view.bonus}
          questions={view.questions}
          chosen={view.chosen}
          onHome={home}
        />
      )
  }
  }
}
