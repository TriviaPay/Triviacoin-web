import { useEffect, useState } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import StatCard from '../components/ui/StatCard'
import Button from '../components/ui/Button'
import { useAppDispatch, useAppSelector } from '../store/store'
import { computeBonus } from '../lib/utils'
import type { LeaderboardEntry } from '../lib/utils'
import { apiService } from '../services/apiService'
import { setQuizStatus } from '../store/quizSlice'
import { ChevronRightIcon } from '../components/icons/TriviaIcons'
import trophyPng from '../assets/trophy.png'

type Props = {
  leaderboardQuery?: UseQueryResult<LeaderboardEntry[]>
}

const Result = (_props: Props) => {
  const dispatch = useAppDispatch()
  const { score, correctCount, questions } = useAppSelector((state) => state.quiz)
  const token = useAppSelector((s) => s.auth.token)
  const [level, setLevel] = useState<number | string>('—')

  const total = questions.length || 10
  const totalPoints = correctCount * 75 + 150

  useEffect(() => {
    console.log('Access Token:', token)
    if (!token) return

    const load = async () => {
      const res = await apiService.fetchProfileSummary(token)
      if (res.success && res.data) {
        // level might be at root or in .level
        const val = res.data.level ?? res.data.data?.level ?? 1
        setLevel(val)
      }
    }
    void load()
  }, [token])

  return (
    <section className="section-card relative flex min-h-[320px] w-full flex-col rounded-3xl bg-quiz-panel text-center text-white shadow-[0_16px_32px_rgba(0,0,0,0.28)] max-w-full sm:max-w-3xl mx-auto">
      <div className="flex justify-center py-4">
        <img src={trophyPng} alt="" className="h-24 w-24 object-contain sm:h-28 sm:w-28" />
      </div>
      <h2 className="text-3xl font-display">Well Done!</h2>
      <p className="text-lg text-cloud">
        You scored {correctCount} out of {total}!
      </p>

      <div className="mt-6 grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Correct Answers" value={correctCount} />
        <StatCard label="wrong answers" value={total - correctCount} />
        <StatCard label="triviacoins Earned" value={totalPoints} />
        <StatCard label="Level" value={level} highlight />
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
        <Button variant="secondary" onClick={() => {}} className="w-full sm:w-auto rounded-full px-6 py-2.5 text-sm uppercase">
          Share Results
        </Button>
        <button
          onClick={() => dispatch(setQuizStatus('review'))}
          className="group flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-[#ffd66b] transition hover:text-[#ffebad] active:scale-95 sm:w-auto"
        >
          Review Questions
          <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </section>
  )
}

export default Result
