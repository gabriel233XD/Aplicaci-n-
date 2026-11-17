import { useCallback, useState } from 'react'
import { exams } from './data/exams'
import type { ExamConfig, ShownQuestion, WeeklyResult } from './types'
import { RULES, dayKey, pickQuestions, simulatedRanking, weekId } from './lib/game'
import { loadSelectedExam, saveSelectedExam, useProgress } from './lib/storage'
import { ExamPicker } from './screens/ExamPicker'
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
  if (!exam) return <ExamPicker onPick={pick} />
  // `key` separa el progreso de cada examen (UNICA, Beca 18, etc.).
  return <ExamApp key={exam.id} exam={exam} onChangeExam={() => pick(null)} />
}

type View =
  | { name: 'home' }
  | { name: 'setup' }
  | { name: 'practice'; questions: ShownQuestion[]; course: string | null }
  | { name: 'practiceResult'; questions: ShownQuestion[]; chosen: number[]; summary: PracticeSummary; course: string | null }
  | { name: 'weekly'; questions: ShownQuestion[] }
  | { name: 'weeklyResult'; questions: ShownQuestion[]; chosen: (number | null)[]; result: WeeklyResult; previous?: WeeklyResult; bonus: number }

function ExamApp({ exam, onChangeExam }: { exam: ExamConfig; onChangeExam: () => void }) {
  const [progress, update] = useProgress(exam.id)
  const [view, setView] = useState<View>({ name: 'home' })
  const [demoMode, setDemoMode] = useState(false)
  const home = () => setView({ name: 'home' })

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
    if (progress.coins < exam.weekly.entryCost) return
    update((p) => ({ ...p, coins: p.coins - exam.weekly.entryCost }))
    setView({ name: 'weekly', questions: pickQuestions(exam.questions, exam.weekly.questionCount) })
  }

  const finishWeekly = useCallback(
    (questions: ShownQuestion[], chosen: (number | null)[]) => {
      const correct = chosen.filter((c, i) => c === questions[i].question.answer).length
      const maxScore = questions.length * RULES.pointsPerQuestion
      const score = correct * RULES.pointsPerQuestion
      const { position, participants } = simulatedRanking(score, maxScore)
      const bonus = position <= 10 ? RULES.top10Bonus : 0
      const result: WeeklyResult = {
        weekId: demoMode ? `demo-${Date.now()}` : weekId(),
        date: new Date().toISOString(),
        score,
        maxScore,
        correct,
        totalQuestions: questions.length,
        position,
        participants,
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
    [demoMode, progress.weeklyResults, update],
  )

  switch (view.name) {
    case 'home':
      return (
        <Home
          exam={exam}
          progress={progress}
          demoMode={demoMode}
          onToggleDemo={() => setDemoMode(!demoMode)}
          onPractice={() => setView({ name: 'setup' })}
          onPracticeTopic={(topic) => startPractice(null, 10, topic)}
          onWeekly={startWeekly}
          onChangeExam={onChangeExam}
        />
      )
    case 'setup':
      return <PracticeSetup exam={exam} onBack={home} onStart={(course, count) => startPractice(course, count)} />
    case 'practice':
      return (
        <Practice
          questions={view.questions}
          onQuit={home}
          onFinish={(answers) => finishPractice(view.questions, answers, view.course)}
        />
      )
    case 'practiceResult':
      return (
        <PracticeResult
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
          questions={view.questions}
          minutes={exam.weekly.minutes}
          onFinish={(chosen) => finishWeekly(view.questions, chosen)}
        />
      )
    case 'weeklyResult':
      return (
        <WeeklyResultView
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
