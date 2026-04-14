import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import Button from '../components/ui/Button'
import ProgressBar from '../components/ui/ProgressBar'
import OptionButton from '../components/quiz/OptionButton'
import type { OptionState } from '../components/quiz/OptionButton'
import TimerPill from '../components/quiz/TimerPill'
import { useAppDispatch, useAppSelector } from '../store/store'
import { finishQuiz, nextQuestion, selectAnswer } from '../store/quizSlice'
import { useTimer } from '../hooks/useTimer'
import { useSound } from '../hooks/useSound'

type Props = {
  loading?: boolean
  onNextFallback: () => void
  questionsCount: number
}

const Quiz = ({ loading, onNextFallback, questionsCount }: Props) => {
  const dispatch = useAppDispatch()
  const { playClick, playCorrect, playWrong, playTick } = useSound()
  const { questions, currentQuestion, selectedAnswer, quizStatus, lastAnswerCorrect } = useAppSelector(
    (state) => state.quiz,
  )
  const modeName = useAppSelector((s) => s.ui.selectedModeName)
  const activeQuestion = questions[currentQuestion]
  const cardRef = useRef<HTMLDivElement | null>(null)

  const handleExpire = useCallback(() => {
    if (currentQuestion >= questions.length - 1) {
      dispatch(finishQuiz())
    } else {
      dispatch(nextQuestion())
    }
    playTick()
  }, [currentQuestion, dispatch, playTick, questions.length])

  const timer = useTimer({ isActive: quizStatus === 'inProgress' && !selectedAnswer, onExpire: handleExpire })

  useEffect(() => {
    if (quizStatus === 'review') return
    if (timer > 0 && timer <= 5 && !selectedAnswer) {
      playTick()
    }
  }, [playTick, quizStatus, selectedAnswer, timer])

  useLayoutEffect(() => {
    if (!cardRef.current) return
    gsap.fromTo(
      cardRef.current,
      { y: 16, opacity: 0, scale: 0.99 },
      { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' },
    )
  }, [currentQuestion])

  const handleSelect = useCallback(
    (id: string) => {
      if (quizStatus === 'review') return
      if (selectedAnswer || !activeQuestion) return
      const picked = activeQuestion.options.find((opt) => opt.id === id)
      if (!picked) return
      dispatch(selectAnswer(id))
      if (picked.isCorrect) playCorrect()
      else playWrong()
    },
    [activeQuestion, dispatch, playCorrect, playWrong, quizStatus, selectedAnswer],
  )

  const handleNext = useCallback(() => {
    playClick()
    if (currentQuestion >= questions.length - 1) {
      dispatch(finishQuiz())
    } else {
      dispatch(nextQuestion())
    }
  }, [currentQuestion, dispatch, playClick, questions.length])

  const optionState = useCallback(
    (id: string, isCorrect: boolean) => {
      if (!selectedAnswer) return 'default'
      if (selectedAnswer === id) return isCorrect ? 'correct' : 'wrong'
      if (isCorrect) return 'correct'
      return 'default'
    },
    [selectedAnswer],
  )

  const totalQuestions = useMemo(() => questions.length || questionsCount || 10, [questions.length, questionsCount])

  if (loading && !activeQuestion) {
    return <div className="section-card w-full rounded-3xl text-center text-white">Loading quiz magic…</div>
  }

  if (!activeQuestion) {
    return (
      <div className="section-card w-full rounded-3xl text-center text-white">
        <p className="mb-2 text-xl font-display">No questions yet</p>
        <Button onClick={onNextFallback}>Reload</Button>
      </div>
    )
  }

  return (
    <section className="section-card relative w-full overflow-hidden rounded-3xl bg-quiz-panel text-white max-w-full sm:max-w-2xl mx-auto">
      <div className="absolute inset-0 opacity-15" aria-hidden>
        <div className="absolute left-8 top-8 h-24 w-24 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute bottom-6 right-10 h-28 w-28 rounded-full bg-[#5ad1ff]/20 blur-3xl" />
      </div>

      <div className="relative flex flex-col gap-4">
        <div className="rounded-t-2xl bg-gradient-to-b from-[#4a9eff]/30 to-transparent px-6 py-3">
          <h2 className="text-xl font-display text-white">{modeName} {quizStatus === 'review' ? 'Review' : 'Quiz'}</h2>
        </div>

        <div className="px-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-cloud">Question {currentQuestion + 1} of {totalQuestions}</p>
            {quizStatus !== 'review' && <TimerPill seconds={timer} />}
          </div>
          <ProgressBar value={currentQuestion + (selectedAnswer ? 1 : 0)} max={totalQuestions} />
        </div>

        <div ref={cardRef} className="mx-6 rounded-2xl p-5">
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-center text-white break-words">{activeQuestion.prompt}</p>
        </div>

        <div className="grid gap-3 px-6">
          {activeQuestion.options.map((option) => (
            <OptionButton
              key={option.id}
              label={option.label}
              text={option.text}
              state={optionState(option.id, option.isCorrect) as OptionState}
              onClick={() => handleSelect(option.id)}
              disabled={(!!selectedAnswer && quizStatus !== 'review' && optionState(option.id, option.isCorrect) === 'default') || quizStatus === 'review'}
            />
          ))}
        </div>

        {selectedAnswer && quizStatus !== 'review' ? (
          <p className={`px-6 text-center text-base font-semibold ${lastAnswerCorrect ? 'text-[#22c55e]' : 'text-coral'}`}>
            {lastAnswerCorrect ? 'Correct!' : 'Keep going!'}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 px-6 pb-4">
          <div className="flex gap-3">
            {quizStatus === 'review' && (
              <Button
                variant="secondary"
                onClick={() => dispatch(prevQuestion())}
                disabled={currentQuestion === 0}
                className="flex-1 rounded-full py-3"
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!selectedAnswer && timer > 0 && quizStatus !== 'review'}
              className="flex-1 rounded-full py-3 text-lg"
            >
              {currentQuestion === totalQuestions - 1 ? (quizStatus === 'review' ? 'End Review' : 'Finish Quiz') : 'Next'}
            </Button>
          </div>

          {quizStatus === 'review' && (
            <button
              onClick={() => dispatch(setQuizStatus('finished'))}
              className="text-xs font-semibold uppercase tracking-widest text-white/40 transition hover:text-white"
            >
              Exit Review
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

export default Quiz
