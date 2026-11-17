import { AnimatePresence, MotionConfig } from 'framer-motion'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { exams } from './data/exams'
import type { ExamConfig, ShownQuestion, WeeklyResult } from './types'
import { RULES, dayKey, pickQuestions, shuffle, simulatedRanking, weekId } from './lib/game'
import { DAILY_REWARD, dailyQuestion, dueMistakes, newAchievements, recordAnswers } from './lib/learning'
import { captureLinkParams, clearDuel, clearRef, pendingDuel, pendingRef } from './lib/share'
import { loadSelectedExam, saveSelectedExam, useProgress } from './lib/storage'
import { useAuth } from './lib/auth'
import { accountsEnabled, supabase, type Ranking } from './lib/supabase'
import { AccountSheet, AuthSheet, ChooseAliasSheet, NewPasswordSheet } from './components/AuthSheet'
import { Screen } from './ui'
import { Toasts, type Toast } from './components/Toasts'
import { InviteSheet } from './components/InviteSheet'
import { Stats } from './screens/Stats'
import { DuelInvite, DuelResult } from './screens/Duel'
import { duelOutcome, type Duel } from './lib/duel'
import { ExamPicker } from './screens/ExamPicker'
import { Welcome } from './screens/Welcome'
import { Home } from './screens/Home'
import { PracticeSetup } from './screens/PracticeSetup'
import { Practice, type PracticeAnswer } from './screens/Practice'
import { WeeklyExam } from './screens/WeeklyExam'
import { PracticeResult, WeeklyResultView, type PracticeSummary } from './screens/Results'

// Guarda ?ref= y ?duelo= del enlace antes de que la app cambie la dirección.
captureLinkParams()

export default function App() {
  const [examId, setExamId] = useState<string | null>(() => {
    const saved = loadSelectedExam()
    if (exams.some((e) => e.id === saved && e.available)) return saved
    // Un enlace de duelo abre directamente el examen (por ahora solo UNICA).
    return pendingDuel() ? (exams.find((e) => e.available)?.id ?? null) : null
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

type PracticeMode = 'normal' | 'review' | 'daily' | 'duel'

type View =
  | { name: 'home' }
  | { name: 'setup' }
  | { name: 'stats' }
  | { name: 'practice'; questions: ShownQuestion[]; course: string | null; mode: PracticeMode; startedAt: number; duelId?: string }
  | { name: 'practiceResult'; questions: ShownQuestion[]; chosen: number[]; summary: PracticeSummary; course: string | null; mode: PracticeMode }
  | { name: 'weekly'; questions: ShownQuestion[] }
  | { name: 'grading'; text?: string }
  | { name: 'weeklyResult'; questions: ShownQuestion[]; chosen: (number | null)[]; result: WeeklyResult; previous?: WeeklyResult; bonus: number }
  | { name: 'duelInvite'; duel: Duel }
  | { name: 'duelResult'; duel: Duel }

const MODE_LABEL: Record<PracticeMode, string | undefined> = {
  normal: undefined,
  review: 'Repaso',
  daily: 'Pregunta del día',
  duel: 'Duelo',
}

const DUEL_SIZE = 5

function ExamApp({ exam, onChangeExam }: { exam: ExamConfig; onChangeExam: () => void }) {
  const auth = useAuth()
  const [progress, update, sync] = useProgress(exam.id, auth.userId)
  const [view, setView] = useState<View>({ name: 'home' })
  const [demoMode, setDemoMode] = useState(false)
  const [sheet, setSheet] = useState<null | { kind: 'auth'; reason?: string } | { kind: 'account' } | { kind: 'invite' }>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const home = () => setView({ name: 'home' })
  /** Con cuentas activadas, el examen real del domingo exige iniciar sesión. */
  const rankedExam = accountsEnabled && !demoMode
  const ready = sync === 'synced' || sync === 'local'

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random()
    setToasts((all) => [...all, { ...t, id }])
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 4500)
  }, [])

  // ── Logros: cuando el progreso cumple uno nuevo, se guarda y se avisa ──
  useEffect(() => {
    if (!ready) return
    const fresh = newAchievements(progress)
    if (fresh.length === 0) return
    const today = dayKey()
    update((p) => ({
      ...p,
      extra: { ...p.extra, achievements: { ...(p.extra.achievements ?? {}), ...Object.fromEntries(fresh.map((a) => [a.id, today])) } },
    }))
    fresh.forEach((a) => toast({ kind: 'achievement', title: `¡Nuevo logro! ${a.name}`, text: a.description }))
  }, [progress, ready, update, toast])

  // ── Invitaciones: aplicar el código del enlace y entregar monedas pendientes ──
  const bonusChecked = useRef(false)
  useEffect(() => {
    if (!supabase || !auth.userId || sync !== 'synced' || !auth.profile?.referralCode || bonusChecked.current) return
    bonusChecked.current = true
    const db = supabase
    void (async () => {
      const ref = pendingRef()
      if (ref) {
        clearRef()
        const { data } = await db.rpc('apply_referral', { p_code: ref })
        if (data === 'ok') toast({ kind: 'coins', title: '¡Bienvenido! +50 monedas', text: 'Por registrarte con la invitación de un amigo.' })
      }
      const [{ data: coins }, { data: invited }] = await Promise.all([db.rpc('claim_bonus_coins'), db.rpc('my_referrals')])
      const amount = typeof coins === 'number' ? coins : 0
      const hasInvited = typeof invited === 'number' && invited > 0
      if (amount > 0 || hasInvited) {
        update((p) => ({
          ...p,
          coins: p.coins + amount,
          extra: hasInvited ? { ...p.extra, flags: { ...p.extra.flags, invited: true } } : p.extra,
        }))
      }
      if (amount > 0) toast({ kind: 'coins', title: `+${amount} monedas`, text: 'Por invitaciones de amigos. ¡Gracias por compartir!' })
    })()
  }, [auth.userId, auth.profile?.referralCode, sync, update, toast])

  // ── Duelo que llegó por enlace ──
  const duelChecked = useRef(false)
  useEffect(() => {
    const id = pendingDuel()
    if (!id || duelChecked.current || !ready) return
    if (!auth.userId || !supabase) {
      if (accountsEnabled && !auth.userId) setSheet({ kind: 'auth', reason: 'Inicia sesión o crea tu cuenta para aceptar el duelo.' })
      return
    }
    duelChecked.current = true
    clearDuel()
    void supabase.rpc('get_duel', { p_id: id }).then(({ data }) => {
      const duel = data as Duel | null
      if (!duel) return toast({ kind: 'achievement', title: 'Duelo no encontrado', text: 'El enlace no es válido o el duelo fue eliminado.' })
      setView(duel.role === 'new' ? { name: 'duelInvite', duel } : { name: 'duelResult', duel })
    })
  }, [auth.userId, ready, toast])

  function questionsByIds(ids: string[]): ShownQuestion[] {
    return ids
      .map((id) => exam.questions.find((q) => q.id === id))
      .filter((q): q is NonNullable<typeof q> => !!q)
      .map((question) => ({ question, order: shuffle(question.options.map((_, i) => i)) }))
  }

  function startPractice(course: string | null, count: number, topic?: string) {
    const pool = exam.questions.filter((q) => (!course || q.course === course) && (!topic || q.topic === topic))
    setView({ name: 'practice', questions: pickQuestions(pool, count), course, mode: 'normal', startedAt: Date.now() })
  }

  function startReview() {
    const due = dueMistakes(progress.extra, exam)
    if (due.length === 0) return
    setView({ name: 'practice', questions: pickQuestions(due, 10), course: null, mode: 'review', startedAt: Date.now() })
  }

  function startDaily() {
    const q = dailyQuestion(exam)
    setView({ name: 'practice', questions: questionsByIds([q.id]), course: null, mode: 'daily', startedAt: Date.now() })
  }

  function startDuel(duel?: Duel) {
    if (!auth.userId || !supabase) {
      setSheet({ kind: 'auth', reason: 'Crea tu cuenta para retar a tus amigos a un duelo.' })
      return
    }
    const questions = duel ? questionsByIds(duel.questionIds) : pickQuestions(exam.questions, DUEL_SIZE)
    setView({ name: 'practice', questions, course: null, mode: 'duel', startedAt: Date.now(), duelId: duel?.id })
  }

  async function finishPractice(questions: ShownQuestion[], answers: PracticeAnswer[], course: string | null, mode: PracticeMode, startedAt: number, duelId?: string) {
    const ms = Date.now() - startedAt
    const isCorrect = (a: PracticeAnswer, i: number) => a.chosen === questions[i].question.answer
    const correct = answers.filter(isCorrect).length
    const coinsCorrect = mode === 'daily' ? 0 : answers.filter((a, i) => !a.usedHint && isCorrect(a, i)).length * RULES.coinsPerCorrect
    const passBonus = (mode === 'normal' || mode === 'review') && (correct / questions.length) * 100 >= RULES.passPercent ? RULES.passBonus : 0
    const dailyBonus = mode === 'daily' ? (correct === 1 ? DAILY_REWARD.correct : DAILY_REWARD.tried) : 0
    const perfect = (mode === 'normal' || mode === 'review') && questions.length >= 10 && correct === questions.length

    const today = dayKey()
    const yesterday = dayKey(new Date(Date.now() - 86_400_000))
    const firstToday = progress.lastPracticeDay !== today
    const streak = !firstToday ? progress.streak : progress.lastPracticeDay === yesterday ? progress.streak + 1 : 1
    const streakBonus = firstToday ? RULES.streakBonus : 0

    update((p) => {
      const topicStats = { ...p.topicStats }
      questions.forEach(({ question }, i) => {
        const s = topicStats[question.topic] ?? { correct: 0, total: 0 }
        topicStats[question.topic] = { correct: s.correct + (isCorrect(answers[i], i) ? 1 : 0), total: s.total + 1 }
      })
      let extra = recordAnswers(p.extra, questions.map(({ question }, i) => ({ question, correct: isCorrect(answers[i], i) })), today)
      if (mode === 'daily') extra = { ...extra, daily: { day: today, correct: correct === 1 } }
      if (perfect) extra = { ...extra, flags: { ...extra.flags, perfect: true } }
      return {
        ...p,
        coins: p.coins + coinsCorrect + passBonus + streakBonus + dailyBonus,
        streak,
        lastPracticeDay: today,
        answered: p.answered + questions.length,
        topicStats,
        extra,
      }
    })

    if (mode === 'duel' && supabase) {
      setView({ name: 'grading', text: 'Guardando tu duelo…' })
      const { data, error } = duelId
        ? await supabase.rpc('submit_duel', { p_id: duelId, p_correct: correct, p_ms: ms })
        : await supabase.rpc('create_duel', { p_exam_id: exam.id, p_question_ids: questions.map((q) => q.question.id), p_correct: correct, p_ms: ms })
      if (error || !data) {
        toast({ kind: 'achievement', title: 'No se pudo guardar el duelo', text: error?.message ?? 'Revisa tu conexión e inténtalo de nuevo.' })
        return home()
      }
      const duel = data as Duel
      if (duelOutcome(duel) === 'win') update((p) => ({ ...p, extra: { ...p.extra, flags: { ...p.extra.flags, duelWon: true } } }))
      return setView({ name: 'duelResult', duel })
    }

    setView({
      name: 'practiceResult',
      questions,
      chosen: answers.map((a) => a.chosen),
      summary: { correct, total: questions.length, coinsCorrect, passBonus, streakBonus, streak, dailyBonus },
      course,
      mode,
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
        // Solo las preguntas respondidas cuentan para el historial y el repaso de errores.
        const answeredItems = questions
          .map(({ question }, i) => ({ question, correct: chosen[i] === question.answer, answered: chosen[i] !== null }))
          .filter((x) => x.answered)
        return {
          ...p,
          coins: p.coins + bonus,
          topicStats,
          weeklyResults: [...p.weeklyResults, result],
          extra: recordAnswers(p.extra, answeredItems),
        }
      })
      setView({ name: 'weeklyResult', questions, chosen, result, previous, bonus })
    },
    [demoMode, rankedExam, auth.userId, exam.id, progress.weeklyResults, update],
  )

  return (
    <>
      <AnimatePresence mode="wait">{renderView()}</AnimatePresence>
      <Toasts toasts={toasts} onClose={(id) => setToasts((all) => all.filter((t) => t.id !== id))} />
      <AnimatePresence>
        {sheet?.kind === 'auth' && <AuthSheet key="auth" reason={sheet.reason} onClose={() => setSheet(null)} />}
        {sheet?.kind === 'account' && <AccountSheet key="account" onClose={() => setSheet(null)} />}
        {sheet?.kind === 'invite' && <InviteSheet key="invite" onClose={() => setSheet(null)} />}
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
          onReview={startReview}
          onDaily={startDaily}
          onStats={() => setView({ name: 'stats' })}
          onInvite={() => (auth.userId ? setSheet({ kind: 'invite' }) : setSheet({ kind: 'auth', reason: 'Crea tu cuenta para invitar amigos y ganar monedas.' }))}
          onDuel={() => startDuel()}
          onOpenDuel={(duel) => setView({ name: 'duelResult', duel })}
        />
      )
    case 'setup':
      return <PracticeSetup key="setup" exam={exam} onBack={home} onStart={(course, count) => startPractice(course, count)} />
    case 'stats':
      return <Stats key="stats" exam={exam} progress={progress} onBack={home} />
    case 'practice':
      return (
        <Practice
          key="practice"
          questions={view.questions}
          label={MODE_LABEL[view.mode]}
          allowHints={view.mode !== 'duel'}
          onQuit={home}
          onFinish={(answers) => void finishPractice(view.questions, answers, view.course, view.mode, view.startedAt, view.duelId)}
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
          onAgain={() => (view.mode === 'review' && dueMistakes(progress.extra, exam).length > 0 ? startReview() : setView({ name: 'setup' }))}
          againLabel={view.mode === 'review' && dueMistakes(progress.extra, exam).length > 0 ? 'Seguir repasando' : undefined}
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
          <h2>{view.text ?? 'Calificando tu examen…'}</h2>
          {!view.text && <p className="muted">Calculando tu puesto en el ranking de Ica.</p>}
        </Screen>
      )
    case 'weeklyResult':
      return (
        <WeeklyResultView
          key="weeklyResult"
          examId={exam.id}
          result={view.result}
          previous={view.previous}
          bonus={view.bonus}
          questions={view.questions}
          chosen={view.chosen}
          onHome={home}
          onAddSchool={() => setSheet({ kind: 'account' })}
        />
      )
    case 'duelInvite':
      return <DuelInvite key="duelInvite" duel={view.duel} onAccept={() => startDuel(view.duel)} onBack={home} />
    case 'duelResult':
      return <DuelResult key={`duelResult-${view.duel.id}`} duel={view.duel} onHome={home} onNewDuel={() => startDuel()} />
  }
  }
}
