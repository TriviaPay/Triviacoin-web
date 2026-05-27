import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent as ReactTouchEvent,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppDispatch, useAppSelector, store, type AppDispatch } from '../../store/store'
import {
  clearSubmissionResult,
  clearTriviaError,
  fetchBronzeModeQuestion,
  fetchBronzeModeStatus,
  fetchCurrentFreeQuestion,
  fetchFreeModeQuestions,
  fetchFreeModeStatus,
  fetchSilverModeQuestion,
  fetchSilverModeStatus,
  freeQuestionAlreadyAttempted,
  isFreeModeComplete,
  jumpToFreeSheetQuestion,
  mergeFreeQuestionWithDailyList,
  resetTriviaUi,
  setCurrentMode,
  setSelectedAnswer,
  submitBronzeModeAnswer,
  submitFreeModeAnswer,
  submitSilverModeAnswer,
  type BronzeSilverModeQuestion,
  type FreeModeQuestion,
} from '../../store/triviaSlice'
import { fetchUserGems } from '../../store/shopSlice'
import Button from '../ui/Button'
import CloseIcon from '../ui/CloseIcon'
import OptionButton from '../quiz/OptionButton'
import type { OptionState } from '../quiz/OptionButton'
import type { TriviaTierMeta } from '../../utils/triviaTierMeta'

export type TriviaPlayMode = 'free' | 'bronze' | 'silver' | 'gold' | 'platinum'

export type { TriviaTierMeta }

type Props = {
  mode: TriviaPlayMode
  onBack: () => void
  /** When 'panel', completion/result modals are absolute within the quiz wrapper (not full viewport). */
  overlayPosition?: 'viewport' | 'panel'
  tierMeta?: TriviaTierMeta | null
  /** Home hero: do not reset trivia UI on mount; no close button; completion uses inline card (no fullscreen modal). */
  embedOnHome?: boolean
  /** Daily challenges: use the same section-card + OptionButton quiz chrome as the home embed (all MCQ modes). */
  useHomeQuizLayout?: boolean
}

function optsFromFree(q: FreeModeQuestion) {
  return [
    { id: 'a' as const, text: q.option_a },
    { id: 'b' as const, text: q.option_b },
    { id: 'c' as const, text: q.option_c },
    { id: 'd' as const, text: q.option_d },
  ]
}

function optsFromBronzeSilver(q: BronzeSilverModeQuestion) {
  return [
    { id: 'a' as const, text: q.option_a },
    { id: 'b' as const, text: q.option_b },
    { id: 'c' as const, text: q.option_c },
    { id: 'd' as const, text: q.option_d },
  ]
}

function mapRawToOptionId(
  q: { option_a: string; option_b: string; option_c: string; option_d: string },
  raw: string | null | undefined
): string | null {
  if (raw == null || raw === '') return null
  const normalized = String(raw).toLowerCase().trim()
  if (['a', 'b', 'c', 'd'].includes(normalized)) return normalized
  const map = { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d } as const
  for (const [id, text] of Object.entries(map)) {
    const t = String(text ?? '').toLowerCase().trim()
    if (!t) continue
    if (t === normalized || t.includes(normalized) || normalized.includes(t)) return id
  }
  return null
}

function mapCorrectToId(
  q: { option_a: string; option_b: string; option_c: string; option_d: string; correct_answer: string },
): string | null {
  return mapRawToOptionId(q, q.correct_answer)
}

async function openFreeCompletionFlow(dispatch: AppDispatch) {
  await dispatch(fetchFreeModeQuestions()).unwrap()
  dispatch(clearTriviaError())
}

export default function TriviaChallengePanel({
  mode,
  onBack,
  overlayPosition = 'viewport',
  tierMeta,
  embedOnHome = false,
  useHomeQuizLayout = false,
}: Props) {
  const homeQuizChrome =
    (embedOnHome && mode === 'free') ||
    Boolean(useHomeQuizLayout && (mode === 'free' || mode === 'bronze' || mode === 'silver'))
  const dispatch = useAppDispatch()
  const auth = useAppSelector((s) => s.auth)
  const trivia = useAppSelector((s) => s.trivia)
  const uiModeName = useAppSelector((s) => s.ui.selectedModeName)

  const [initialized, setInitialized] = useState(false)
  const [freeModeReviewMode, setFreeModeReviewMode] = useState(false)
  const [freeModeReviewIndex, setFreeModeReviewIndex] = useState(0)
  const [timerSec, setTimerSec] = useState<number | null>(null)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** True only when review mode was auto-opened before `freeQ` loaded (embed / home layout); cleared when play mode resumes or user opens review intentionally. */
  const reviewAutoOpenedByEmbedRef = useRef(false)
  /** Track horizontal swipe start for free-mode replay-locked → next question. */
  const freeReplaySwipeRef = useRef<{ x: number; y: number } | null>(null)

  const freeQ = trivia.currentFreeModeQuestion
  const bronzeQ = trivia.currentBronzeModeQuestion
  const silverQ = trivia.currentSilverModeQuestion

  const sortedFreeQuestions = useMemo(() => {
    const list = trivia.freeModeQuestions ?? []
    return [...list].sort((a, b) => (a.question_order ?? 0) - (b.question_order ?? 0))
  }, [trivia.freeModeQuestions])

  const question = useMemo(() => {
    if (mode === 'bronze') return bronzeQ
    if (mode === 'silver') return silverQ
    if (mode === 'free' && freeModeReviewMode && sortedFreeQuestions.length > 0) {
      const idx = Math.max(0, Math.min(freeModeReviewIndex, sortedFreeQuestions.length - 1))
      return sortedFreeQuestions[idx]
    }
    return freeQ
  }, [mode, freeModeReviewMode, freeModeReviewIndex, sortedFreeQuestions, freeQ, bronzeQ, silverQ])

  const options = useMemo(() => {
    if (!question) return []
    if (mode === 'free' || freeModeReviewMode) return optsFromFree(question as FreeModeQuestion)
    return optsFromBronzeSilver(question as BronzeSilverModeQuestion)
  }, [question, mode, freeModeReviewMode])

  const correctOptionId = useMemo(() => {
    if (!question) return null
    const q = question as FreeModeQuestion | BronzeSilverModeQuestion
    const fromQuestion = mapCorrectToId(q)
    if (fromQuestion) return fromQuestion
    const ca = trivia.submissionResult?.correct_answer
    if (ca) return mapRawToOptionId(q, ca)
    return null
  }, [question, trivia.submissionResult?.correct_answer])

  /** Server (or merged daily list) marks this MCQ answered — reveal correct/wrong only, no second submit. */
  const freeReplayLocked = useMemo(
    () =>
      mode === 'free' &&
      !freeModeReviewMode &&
      !!question &&
      freeQuestionAlreadyAttempted(question as FreeModeQuestion),
    [mode, freeModeReviewMode, question],
  )

  const progressLabel = useMemo(() => {
    if (mode !== 'free' || !trivia.freeModeStatus?.progress) return null
    const { correct_answers, total_questions } = trivia.freeModeStatus.progress
    return `${correct_answers} / ${total_questions}`
  }, [mode, trivia.freeModeStatus])

  const hasAttemptedAnyFree = useMemo(() => {
    if (sortedFreeQuestions.length === 0) return false
    return sortedFreeQuestions.some(
      (q) =>
        q.answered_at != null ||
        q.is_correct != null ||
        (q.fill_in_answer != null && String(q.fill_in_answer).length > 0)
    )
  }, [sortedFreeQuestions])

  /** Home embed / daily chrome: no `/current` yet — jump into option-card review instead of summary lists or modals. */
  useEffect(() => {
    if (!embedOnHome && !useHomeQuizLayout) return
    if (mode !== 'free' || !initialized || trivia.loading) return
    if (freeQ) return
    if (sortedFreeQuestions.length === 0) return
    if (isFreeModeComplete(trivia.freeModeStatus)) return
    if (freeModeReviewMode) return
    dispatch(clearTriviaError())
    reviewAutoOpenedByEmbedRef.current = true
    setFreeModeReviewMode(true)
    setFreeModeReviewIndex(0)
  }, [
    embedOnHome,
    mode,
    initialized,
    trivia.loading,
    freeQ,
    sortedFreeQuestions.length,
    trivia.freeModeStatus,
    freeModeReviewMode,
    dispatch,
    useHomeQuizLayout,
  ])

  /** Desktop / trivia page: mirror embed — MCQ-only review rows, never the text “Your answers” list. */
  useEffect(() => {
    if (embedOnHome || useHomeQuizLayout) return
    if (mode !== 'free' || !initialized || trivia.loading) return
    if (freeQ) return
    if (sortedFreeQuestions.length === 0) return
    if (isFreeModeComplete(trivia.freeModeStatus)) return
    if (freeModeReviewMode) return
    dispatch(clearTriviaError())
    reviewAutoOpenedByEmbedRef.current = false
    setFreeModeReviewMode(true)
    setFreeModeReviewIndex(0)
  }, [
    embedOnHome,
    mode,
    initialized,
    trivia.loading,
    freeQ,
    sortedFreeQuestions.length,
    trivia.freeModeStatus,
    freeModeReviewMode,
    dispatch,
    useHomeQuizLayout,
  ])

  /** After auto “review” before fetch, exit review when the live question arrives so options are tappable. */
  useEffect(() => {
    if (!freeQ || !freeModeReviewMode || !reviewAutoOpenedByEmbedRef.current) return
    if (isFreeModeComplete(trivia.freeModeStatus)) return
    reviewAutoOpenedByEmbedRef.current = false
    setFreeModeReviewMode(false)
  }, [freeQ, freeModeReviewMode, trivia.freeModeStatus])

  /** Initial load per mode */
  useEffect(() => {
    if (!auth.isAuthenticated && mode !== 'free') {
      setInitialized(true)
      return
    }

    if (mode === 'gold' || mode === 'platinum') {
      setInitialized(true)
      return
    }

    let cancelled = false
    const run = async () => {
      dispatch(setCurrentMode(mode))
      if (!embedOnHome) {
        dispatch(resetTriviaUi())
      }
      reviewAutoOpenedByEmbedRef.current = false
      setFreeModeReviewMode(false)
      setFreeModeReviewIndex(0)

      try {
        if (mode === 'free') {
          let status = await dispatch(fetchFreeModeStatus()).unwrap()
          if (cancelled) return

          if (isFreeModeComplete(status)) {
            await openFreeCompletionFlow(dispatch)
            if (cancelled) return
            reviewAutoOpenedByEmbedRef.current = false
            setFreeModeReviewMode(true)
            setFreeModeReviewIndex(0)
            if (auth.isAuthenticated) void dispatch(fetchUserGems())
            setInitialized(true)
            return
          }

          await dispatch(fetchFreeModeQuestions()).unwrap().catch(() => {})

          try {
            await dispatch(fetchCurrentFreeQuestion()).unwrap()
          } catch {
            status = await dispatch(fetchFreeModeStatus()).unwrap()
            if (cancelled) return
            if (isFreeModeComplete(status)) {
              await openFreeCompletionFlow(dispatch)
              reviewAutoOpenedByEmbedRef.current = false
              setFreeModeReviewMode(true)
              setFreeModeReviewIndex(0)
              if (auth.isAuthenticated) void dispatch(fetchUserGems())
            } else {
              dispatch(clearTriviaError())
            }
          }
        } else if (mode === 'bronze') {
          await Promise.all([dispatch(fetchBronzeModeQuestion()).unwrap(), dispatch(fetchBronzeModeStatus()).unwrap()])
        } else {
          await Promise.all([dispatch(fetchSilverModeQuestion()).unwrap(), dispatch(fetchSilverModeStatus()).unwrap()])
        }
      } catch {
        /* handled in slice */
      } finally {
        if (!cancelled) setInitialized(true)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [auth.isAuthenticated, dispatch, mode, embedOnHome])

  /** Bronze / silver countdown */
  useEffect(() => {
    if (mode !== 'bronze' && mode !== 'silver') {
      setTimerSec(null)
      return
    }
    const q = question as BronzeSilverModeQuestion | null
    if (!q || typeof q.time_until_close_seconds !== 'number') {
      setTimerSec(null)
      return
    }
    setTimerSec(Math.max(0, q.time_until_close_seconds))
  }, [mode, question])

  useEffect(() => {
    if (timerSec === null || timerSec <= 0) return
    const id = window.setInterval(() => {
      setTimerSec((s) => (s === null ? s : Math.max(0, s - 1)))
    }, 1000)
    return () => window.clearInterval(id)
  }, [timerSec])

  const status = mode === 'bronze' ? trivia.bronzeModeStatus : mode === 'silver' ? trivia.silverModeStatus : null
  const alreadySubmitted =
    mode !== 'free' &&
    !!(
      status?.has_submitted ||
      status?.submitted_at ||
      status?.fill_in_answer ||
      (question as BronzeSilverModeQuestion | null)?.submitted_at
    )

  const userPickId = useMemo(() => {
    if (!question) return trivia.selectedAnswer
    if (mode === 'free' && freeModeReviewMode) {
      const fq = question as FreeModeQuestion
      const mapped = mapRawToOptionId(fq, fq.fill_in_answer)
      return mapped
    }
    if (mode === 'free' && !freeModeReviewMode && freeQuestionAlreadyAttempted(question as FreeModeQuestion)) {
      const fq = question as FreeModeQuestion
      return mapRawToOptionId(fq, fq.fill_in_answer) ?? trivia.selectedAnswer
    }
    if (mode === 'free') return trivia.selectedAnswer
    const fill = status?.fill_in_answer ?? (question as BronzeSilverModeQuestion).fill_in_answer
    const mapped = mapRawToOptionId(question as BronzeSilverModeQuestion, fill)
    return mapped ?? trivia.selectedAnswer
  }, [question, mode, freeModeReviewMode, status, trivia.selectedAnswer])

  /** After merge, hydrate selection from saved answer when `/current` had no Redux pick yet. */
  useEffect(() => {
    if (mode !== 'free' || freeModeReviewMode || !question) return
    const fq = question as FreeModeQuestion
    if (!freeQuestionAlreadyAttempted(fq)) return
    const id = mapRawToOptionId(fq, fq.fill_in_answer)
    if (!id) return
    const opt = fq[`option_${id}` as keyof FreeModeQuestion]
    const text = typeof opt === 'string' ? opt : ''
    if (trivia.selectedAnswer === id && trivia.selectedOptionText) return
    dispatch(setSelectedAnswer({ id, text }))
  }, [mode, freeModeReviewMode, question, trivia.selectedAnswer, trivia.selectedOptionText, dispatch])

  /** Home embed: stale Redux selection from another screen/question locks OptionButtons — clear on question change. */
  const lastEmbedFreeQuestionIdRef = useRef<number | null>(null)
  useEffect(() => {
    if (!embedOnHome || mode !== 'free') {
      lastEmbedFreeQuestionIdRef.current = null
      return
    }
    const fq = freeQ as FreeModeQuestion | null
    const qid = fq?.question_id
    if (qid == null || typeof qid !== 'number') return
    const prev = lastEmbedFreeQuestionIdRef.current
    if (prev !== null && prev !== qid) {
      dispatch(setSelectedAnswer({ id: null, text: null }))
      if (trivia.isSubmitted) dispatch(clearSubmissionResult())
    }
    lastEmbedFreeQuestionIdRef.current = qid
  }, [embedOnHome, mode, freeQ, dispatch, trivia.isSubmitted])

  const showedPriorResultRef = useRef(false)

  useEffect(() => {
    if (mode === 'free' || !initialized) return
    if (alreadySubmitted && !showedPriorResultRef.current) {
      showedPriorResultRef.current = true
    }
  }, [mode, initialized, alreadySubmitted])

  useEffect(() => {
    if (mode === 'free') return
    if (trivia.isSubmitted && trivia.submissionResult) {
      void dispatch(fetchUserGems())
    }
  }, [mode, trivia.isSubmitted, trivia.submissionResult, dispatch])

  /** Free mode: advance after answer (submit) — home embed uses a shorter pause for smoother UX. */
  useEffect(() => {
    if (mode !== 'free' || freeModeReviewMode || !trivia.isSubmitted || !trivia.submissionResult) return

    const delayMs = embedOnHome ? 420 : 1500
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    advanceTimer.current = setTimeout(async () => {
      try {
        const st = await dispatch(fetchFreeModeStatus()).unwrap()
        if (isFreeModeComplete(st)) {
          await openFreeCompletionFlow(dispatch)
          reviewAutoOpenedByEmbedRef.current = false
          setFreeModeReviewMode(true)
          setFreeModeReviewIndex(0)
          dispatch(clearSubmissionResult())
          if (auth.isAuthenticated) void dispatch(fetchUserGems())
          return
        }
        dispatch(clearSubmissionResult())
        await dispatch(fetchCurrentFreeQuestion()).unwrap()
        if (auth.isAuthenticated) void dispatch(fetchUserGems())
      } catch {
        dispatch(clearSubmissionResult())
      }
    }, delayMs)

    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
    }
  }, [mode, freeModeReviewMode, trivia.isSubmitted, trivia.submissionResult, dispatch, embedOnHome, auth.isAuthenticated])

  const handleFreeSelect = useCallback(
    (id: 'a' | 'b' | 'c' | 'd', text: string) => {
      if (!question || trivia.loading || freeModeReviewMode) return
      if (mode === 'free' && freeQuestionAlreadyAttempted(question as FreeModeQuestion)) return
      if (trivia.isSubmitted) return
      dispatch(setSelectedAnswer({ id, text }))
    },
    [question, trivia.loading, trivia.isSubmitted, freeModeReviewMode, mode, dispatch]
  )

  const handleSubmitFree = useCallback(() => {
    if (mode !== 'free' || freeModeReviewMode) return
    const q = question as FreeModeQuestion | null
    if (q && freeQuestionAlreadyAttempted(q)) return
    const text = trivia.selectedOptionText
    if (!q || !text || trivia.loading || trivia.isSubmitted) return
    void dispatch(submitFreeModeAnswer({ question_id: q.question_id, answer: text }))
  }, [mode, freeModeReviewMode, question, trivia.selectedOptionText, trivia.loading, trivia.isSubmitted, dispatch])

  /** After viewing a replay-locked (already attempted) MCQ — walk today’s sheet until an unanswered question or completion. */
  const handleFreeAdvanceFromReplay = useCallback(async () => {
    if (mode !== 'free' || freeModeReviewMode || trivia.loading) return
    const fq = trivia.currentFreeModeQuestion as FreeModeQuestion | null
    if (!fq || !freeQuestionAlreadyAttempted(fq)) return
    dispatch(clearTriviaError())
    dispatch(clearSubmissionResult())
    try {
      const st = await dispatch(fetchFreeModeStatus()).unwrap()
      if (isFreeModeComplete(st)) {
        await openFreeCompletionFlow(dispatch)
        reviewAutoOpenedByEmbedRef.current = false
        setFreeModeReviewMode(true)
        setFreeModeReviewIndex(0)
        if (auth.isAuthenticated) void dispatch(fetchUserGems())
        return
      }

      await dispatch(fetchFreeModeQuestions()).unwrap().catch(() => {})
      try {
        await dispatch(fetchCurrentFreeQuestion()).unwrap()
      } catch {
        /* No `/current` payload — still walk the sheet from list order. */
        dispatch(clearTriviaError())
      }

      const list = store.getState().trivia.freeModeQuestions ?? []
      const sorted =
        list.length > 0 ? [...list].sort((a, b) => (a.question_order ?? 0) - (b.question_order ?? 0)) : []

      const currentAfterFetch = store.getState().trivia.currentFreeModeQuestion as FreeModeQuestion | null
      const n = sorted.length
      if (n === 0) {
        if (auth.isAuthenticated) void dispatch(fetchUserGems())
        return
      }

      /*
       If `/current` already points at an unanswered question, Redux is correct — do not sheet-walk from
       startIdx + 1 (that would skip the server’s next question, e.g. Q2 → Q3).
       */
      if (currentAfterFetch) {
        const mergedNow = mergeFreeQuestionWithDailyList(currentAfterFetch, sorted)
        if (!freeQuestionAlreadyAttempted(mergedNow)) {
          if (auth.isAuthenticated) void dispatch(fetchUserGems())
          return
        }
      }

      let startIdx =
        currentAfterFetch ? sorted.findIndex((q) => q.question_id === currentAfterFetch.question_id) : -1
      if (startIdx < 0) startIdx = 0

      /* Visit every question in cycle starting after the server “current” until one is not yet attempted. */
      for (let s = 0; s < n; s++) {
        const idx = (startIdx + 1 + s) % n
        const cand = sorted[idx]
        const mergedCand = mergeFreeQuestionWithDailyList(cand, sorted)
        if (!freeQuestionAlreadyAttempted(mergedCand)) {
          dispatch(jumpToFreeSheetQuestion(cand.question_id))
          if (auth.isAuthenticated) void dispatch(fetchUserGems())
          return
        }
      }

      await openFreeCompletionFlow(dispatch)
      reviewAutoOpenedByEmbedRef.current = false
      setFreeModeReviewMode(true)
      setFreeModeReviewIndex(0)
      if (auth.isAuthenticated) void dispatch(fetchUserGems())
    } catch {
      dispatch(clearTriviaError())
    }
  }, [
    mode,
    freeModeReviewMode,
    trivia.loading,
    trivia.currentFreeModeQuestion,
    dispatch,
    auth.isAuthenticated,
  ])

  const handleBronzeSilverSelect = useCallback(
    (id: 'a' | 'b' | 'c' | 'd', text: string) => {
      if (!question || trivia.loading) return
      if (alreadySubmitted) return
      if (trivia.isSubmitted) return
      dispatch(setSelectedAnswer({ id, text }))
    },
    [question, trivia.loading, trivia.isSubmitted, alreadySubmitted, dispatch]
  )

  const handleSubmitBronzeSilver = useCallback(() => {
    if (mode !== 'bronze' && mode !== 'silver') return
    const q = question as BronzeSilverModeQuestion | null
    const text = trivia.selectedOptionText
    if (!q || !text || trivia.loading || trivia.isSubmitted || alreadySubmitted) return
    if (mode === 'bronze') {
      void dispatch(submitBronzeModeAnswer({ question_id: q.question_id, answer: text }))
    } else {
      void dispatch(submitSilverModeAnswer({ question_id: q.question_id, answer: text }))
    }
  }, [mode, question, trivia.selectedOptionText, trivia.loading, trivia.isSubmitted, alreadySubmitted, dispatch])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const selectedId = userPickId ?? trivia.selectedAnswer
  const freeSubmitted = mode === 'free' && !freeModeReviewMode && trivia.isSubmitted
  const bronzeSilverAnswered =
    (mode === 'bronze' || mode === 'silver') && (trivia.isSubmitted || alreadySubmitted)
  const bronzeSilverMarks = bronzeSilverAnswered
  const marksActive = freeSubmitted || bronzeSilverMarks || freeModeReviewMode || freeReplayLocked

  const onFreeReplayTouchStart = useCallback(
    (e: ReactTouchEvent) => {
      if (!freeReplayLocked || trivia.loading || freeModeReviewMode) return
      const t = e.touches[0]
      if (!t) return
      freeReplaySwipeRef.current = { x: t.clientX, y: t.clientY }
    },
    [freeReplayLocked, trivia.loading, freeModeReviewMode],
  )

  const onFreeReplayTouchEnd = useCallback(
    (e: ReactTouchEvent) => {
      if (!freeReplayLocked || trivia.loading || freeModeReviewMode) {
        freeReplaySwipeRef.current = null
        return
      }
      const start = freeReplaySwipeRef.current
      freeReplaySwipeRef.current = null
      if (!start) return
      const t = e.changedTouches[0]
      if (!t) return
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      if (dx < -56 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        void handleFreeAdvanceFromReplay()
      }
    },
    [freeReplayLocked, trivia.loading, freeModeReviewMode, handleFreeAdvanceFromReplay],
  )

  const optionClass = (id: string) => {
    const base =
      'w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition sm:py-4 sm:text-base '
    const showResult = marksActive && correctOptionId
    if (!showResult) {
      return base + (selectedId === id ? 'border-[#ffd66b] border-2 bg-[#ffd66b]/20 text-white shadow-[0_0_12px_rgba(255,214,107,0.3)] ring-1 ring-[#ffd66b]/30' : 'border-white/20 bg-white/5 text-white hover:bg-white/10')
    }
    if (correctOptionId && id === correctOptionId) {
      return base + 'border-green-500 bg-green-500/15 text-green-100'
    }
    if (correctOptionId && id === selectedId && id !== correctOptionId) {
      return base + 'border-red-500 bg-red-500/15 text-red-100'
    }
    return base + 'border-white/10 bg-black/20 text-white/50'
  }

  const embedFreeTotal = useMemo(() => {
    const t = trivia.freeModeStatus?.progress?.total_questions
    if (typeof t === 'number' && t > 0) return t
    return Math.max(sortedFreeQuestions.length, 1)
  }, [trivia.freeModeStatus?.progress?.total_questions, sortedFreeQuestions.length])

  const embedFreeQuestionNum = useMemo(() => {
    if (freeModeReviewMode) return freeModeReviewIndex + 1
    const fq = freeQ as FreeModeQuestion | null
    if (!fq) return 1
    const ix = sortedFreeQuestions.findIndex((q) => q.question_id === fq.question_id)
    if (ix >= 0) return ix + 1
    return typeof fq.question_order === 'number' && fq.question_order > 0 ? fq.question_order : 1
  }, [freeModeReviewMode, freeModeReviewIndex, freeQ, sortedFreeQuestions])

  const embedHomeContentKey = useMemo(() => {
    if (freeModeReviewMode) return `rv-${freeModeReviewIndex}`
    const fq = freeQ as FreeModeQuestion | null
    return `pl-${fq?.question_id ?? 'none'}`
  }, [freeModeReviewMode, freeModeReviewIndex, freeQ])

  const embedOptionState = useCallback(
    (id: string): OptionState => {
      if (!marksActive || !correctOptionId) {
        if (selectedId === id) return 'selected'
        return 'default'
      }
      if (id === correctOptionId) return 'correct'
      if (selectedId === id) return 'wrong'
      return 'default'
    },
    [marksActive, correctOptionId, selectedId],
  )

  const embedFreeLastCorrect = useMemo(() => {
    if (!freeSubmitted || !trivia.submissionResult) return null
    return trivia.submissionResult.is_correct === true
  }, [freeSubmitted, trivia.submissionResult])

  if (!auth.isAuthenticated && mode !== 'free') {
    return (
      <div className={`relative rounded-3xl border border-white/15 bg-black/20 p-6 text-center text-white ${embedOnHome ? '' : 'space-y-4'}`}>
        {!embedOnHome ? (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={onBack}
              className="flex shrink-0 items-center justify-center rounded-full p-1.5 text-white/80 transition hover:bg-white/10"
              aria-label="Close"
            >
              <CloseIcon className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>
          </div>
        ) : null}
        <p className="text-sm sm:text-base">Sign in to play paid trivia modes.</p>
      </div>
    )
  }

  if (mode === 'gold' || mode === 'platinum') {
    const label = tierMeta?.tierLabel ?? (mode === 'gold' ? 'Gold ($15)' : 'Platinum ($20)')
    return (
      <div
        className={
          overlayPosition === 'panel'
            ? 'relative flex min-h-0 flex-1 flex-col space-y-4'
            : embedOnHome
              ? 'relative space-y-4'
              : 'relative mt-6 space-y-4'
        }
      >
        {!embedOnHome ? (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={onBack}
              className="flex shrink-0 items-center justify-center rounded-full p-1.5 text-white/80 transition hover:bg-white/10"
              aria-label="Close"
            >
              <CloseIcon className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>
          </div>
        ) : null}
        <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-white/10 to-transparent p-5 sm:p-6">
          <p className="text-xs uppercase tracking-wide text-white/60">{label}</p>
          <h4 className="mt-2 font-display text-xl text-white sm:text-2xl">Premium trivia</h4>
          {tierMeta?.entryLabel ? (
            <p className="mt-3 text-sm text-white/90">
              Entry <span className="font-semibold text-amber-200">{tierMeta.entryLabel}</span>
            </p>
          ) : null}
          {tierMeta?.prizeLabel ? (
            <p className="mt-1 text-sm text-white/90">
              Prize <span className="font-semibold text-emerald-200/95">{tierMeta.prizeLabel}</span>
            </p>
          ) : null}
          {tierMeta?.subscribedHint ? (
            <p className="mt-2 text-xs text-emerald-200/90">{tierMeta.subscribedHint}</p>
          ) : null}
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            Web play for this tier is not available yet. Use the mobile app to compete in {mode === 'gold' ? 'Gold' : 'Platinum'} mode.
          </p>
        </div>
      </div>
    )
  }

  const loadingQuestion = trivia.loading && !question && !trivia.error
  const err = trivia.error
  const hideErrorBanner = freeModeReviewMode

  return (
    <div
      className={
        overlayPosition === 'panel'
          ? 'relative flex min-h-0 flex-1 flex-col space-y-4'
          : embedOnHome
            ? 'relative flex flex-col space-y-4'
            : 'relative mt-6 space-y-4'
      }
    >
      {!embedOnHome ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/90">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {tierMeta?.entryLabel ? (
              <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1">
                Entry <span className="font-semibold text-white">{tierMeta.entryLabel}</span>
              </span>
            ) : null}
            {tierMeta?.prizeLabel ? (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-100">
                Prize <span className="font-semibold">{tierMeta.prizeLabel}</span>
              </span>
            ) : null}
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {progressLabel ? <span className="rounded-full border border-white/20 px-3 py-1">Progress: {progressLabel}</span> : null}
            {freeModeReviewMode && sortedFreeQuestions.length > 0 ? (
              <span className="rounded-full border border-white/20 px-3 py-1">
                Review {freeModeReviewIndex + 1}/{sortedFreeQuestions.length}
              </span>
            ) : null}
            {timerSec !== null && timerSec >= 0 ? (
              <span className="rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1 font-medium text-amber-100">
                Closes in {formatTime(timerSec)}
              </span>
            ) : null}
            <button
              type="button"
              onClick={onBack}
              className="flex shrink-0 items-center justify-center rounded-full p-1.5 text-white/80 transition hover:bg-white/10"
              aria-label="Close"
            >
              <CloseIcon className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>
          </div>
        </div>
      ) : null}

      {err && !hideErrorBanner ? (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">
          {err}
          <Button
            className="mt-3"
            onClick={() => {
              dispatch(resetTriviaUi())
              if (mode === 'free') void dispatch(fetchCurrentFreeQuestion())
              else if (mode === 'bronze') void dispatch(fetchBronzeModeQuestion())
              else void dispatch(fetchSilverModeQuestion())
            }}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {loadingQuestion ? (
        <div className="flex justify-center py-12 text-white/80">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-label="Loading" />
        </div>
      ) : null}



      {freeModeReviewMode && sortedFreeQuestions.length > 0 && !embedOnHome && !useHomeQuizLayout ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="ghost"
            className="text-white"
            onClick={() => setFreeModeReviewIndex((i) => Math.max(0, i - 1))}
            disabled={freeModeReviewIndex <= 0}
          >
            Prev
          </Button>
          <Button variant="ghost" className="text-white" onClick={() => setFreeModeReviewMode(false)}>
            Exit
          </Button>
          <Button
            variant="ghost"
            className="text-white"
            onClick={() => setFreeModeReviewIndex((i) => Math.min(sortedFreeQuestions.length - 1, i + 1))}
            disabled={freeModeReviewIndex >= sortedFreeQuestions.length - 1}
          >
            Next
          </Button>
        </div>
      ) : null}

      {question && !loadingQuestion ? (
        homeQuizChrome ? (
          <section
            className={`relative mx-auto flex w-full max-w-full flex-col overflow-hidden bg-quiz-panel text-white sm:max-w-2xl ${
              embedOnHome
                ? 'flex h-auto w-full flex-col overflow-hidden rounded-2xl border border-white/15 shadow-[0_16px_32px_rgba(0,0,0,0.28)] sm:rounded-3xl lg:max-h-[calc(30rem+20px)]'
                : `section-card rounded-3xl ${
                    useHomeQuizLayout ? 'max-h-none min-h-0' : 'min-h-[min(26rem,55vh)]'
                  }`
            }`}
          >
            <div className="absolute inset-0 opacity-15" aria-hidden>
              <div className="absolute left-8 top-8 h-24 w-24 rounded-full bg-white/15 blur-3xl" />
              <div className="absolute bottom-6 right-10 h-28 w-28 rounded-full bg-[#5ad1ff]/20 blur-3xl" />
            </div>

            <div className={`relative flex flex-col ${embedOnHome ? '' : 'min-h-0 flex-1'}`}>
              <div
                className={`shrink-0 rounded-t-2xl bg-gradient-to-b from-[#4a9eff]/30 to-transparent ${
                  homeQuizChrome ? 'px-3 py-1.5 sm:px-5 sm:py-2' : 'px-4 py-2 sm:px-6 sm:py-3'
                }`}
              >
                <h2
                  className={`font-display text-white ${homeQuizChrome ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'}`}
                >
                  {mode === 'free'
                    ? `${uiModeName || 'Free'} Quiz`
                    : `${uiModeName || (mode === 'bronze' ? 'Bronze' : 'Silver')} Quiz`}
                </h2>
                <p
                  className={`mt-0.5 text-center text-cloud ${homeQuizChrome ? 'text-[10px] sm:text-xs' : 'text-xs sm:mt-1 sm:text-sm'}`}
                >
                  {mode === 'free' ? (
                    <>
                      Question {embedFreeQuestionNum} of {embedFreeTotal}
                    </>
                  ) : timerSec !== null && timerSec >= 0 ? (
                    <>Closes in {formatTime(timerSec)}</>
                  ) : (
                    <>Daily question · select an answer, then Submit</>
                  )}
                  {mode !== 'free' && (question as BronzeSilverModeQuestion).category ? (
                    <span className="mt-1 block text-xs text-white/60">
                      {(question as BronzeSilverModeQuestion).category}
                    </span>
                  ) : null}
                </p>
              </div>

              {mode === 'free' ? (
                <AnimatePresence mode="wait" initial={false}>
                  {embedOnHome && freeSubmitted && trivia.submissionResult ? (
                    <motion.div
                      key="embed-free-advancing"
                      role="status"
                      aria-live="polite"
                      aria-busy="true"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                      className={`flex flex-col items-center justify-center gap-4 px-4 sm:gap-5 sm:px-6 ${embedOnHome ? 'flex-none py-6 sm:py-8' : 'flex-1 py-10 sm:py-14'}`}
                    >
                      <p
                        className={`text-center text-lg font-display font-bold sm:text-xl ${embedFreeLastCorrect ? 'text-[#22c55e]' : 'text-coral'}`}
                      >
                        {embedFreeLastCorrect ? 'Correct!' : 'Keep going!'}
                      </p>
                      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/25 border-t-[#ffd66b]" />
                      <p className="text-center text-sm text-cloud">Loading next question…</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={embedHomeContentKey}
                      role="group"
                      aria-live="polite"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                      className={`flex flex-col overflow-hidden pb-0 touch-pan-y ${embedOnHome ? '' : 'min-h-0 flex-1'}`}
                      onTouchStart={onFreeReplayTouchStart}
                      onTouchEnd={onFreeReplayTouchEnd}
                    >
                      <div
                        className={
                          embedOnHome
                            ? 'flex flex-col overflow-y-auto scrollbar-overlay lg:max-h-[calc(30rem-5rem+20px)]'
                            : homeQuizChrome
                              ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
                              : 'min-h-0 flex-1 overflow-y-auto scrollbar-overlay'
                        }
                      >
                        <div
                          className={`mx-3 rounded-2xl sm:mx-6 ${homeQuizChrome ? 'shrink-0 p-2 sm:p-3' : 'p-3 sm:p-5'}`}
                        >
                          <p
                            className={`text-center font-bold leading-snug text-white break-words ${
                              homeQuizChrome
                                ? 'text-sm sm:text-base'
                                : 'text-base sm:text-lg md:text-xl'
                            }`}
                          >
                            {(question as FreeModeQuestion).question}
                          </p>
                          {!homeQuizChrome && (question as FreeModeQuestion).hint ? (
                            <p className="mt-2 text-center text-xs text-cloud sm:mt-3 sm:text-sm">
                              Hint: {(question as FreeModeQuestion).hint}
                            </p>
                          ) : null}
                          {freeReplayLocked ? (
                            <>
                              <p className="mt-2 text-center text-xs font-semibold text-amber-200/90 sm:text-sm">
                                Already answered
                                {(question as FreeModeQuestion).is_correct === true
                                  ? ' · Correct'
                                  : (question as FreeModeQuestion).is_correct === false
                                    ? ' · Incorrect'
                                    : ''}
                              </p>
                              <p className="mt-1 text-center text-[10px] text-white/55 sm:text-xs">
                                Swipe left for next question, or tap Next below
                              </p>
                            </>
                          ) : null}
                        </div>

                        <div
                          className={`grid px-3 sm:px-6 ${homeQuizChrome ? 'shrink-0 gap-1.5 pb-2 sm:gap-2' : 'gap-2 pb-3 sm:gap-3'}`}
                        >
                          {options.map((o) => (
                            <OptionButton
                              key={o.id}
                              label={o.id.toUpperCase()}
                              text={o.text}
                              state={embedOptionState(o.id)}
                              compact={homeQuizChrome}
                              disabled={trivia.loading || freeSubmitted || freeModeReviewMode || freeReplayLocked}
                              onClick={() => {
                                if (freeModeReviewMode) return
                                handleFreeSelect(o.id, o.text)
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {freeModeReviewMode ? (
                        <div
                          className={`shrink-0 border-t border-white/10 bg-[#0a3b89]/75 px-3 sm:px-6 ${homeQuizChrome ? 'py-1.5 sm:py-2' : 'py-2 sm:py-3'}`}
                        >
                          <Button
                            onClick={() => {
                              if (freeModeReviewIndex >= sortedFreeQuestions.length - 1) {
                                startTransition(() => setFreeModeReviewIndex(0))
                              } else {
                                startTransition(() =>
                                  setFreeModeReviewIndex((i) => Math.min(sortedFreeQuestions.length - 1, i + 1)),
                                )
                              }
                            }}
                            className={`w-full rounded-full font-semibold ${
                              homeQuizChrome
                                ? 'px-5 py-2 text-xs sm:px-8 sm:py-2.5 sm:text-sm'
                                : 'px-6 py-2.5 text-sm sm:px-10 sm:py-3 sm:text-base'
                            }`}
                          >
                            {freeModeReviewIndex >= sortedFreeQuestions.length - 1 ? 'Back to start' : 'Next Question'}
                          </Button>
                        </div>
                      ) : (
                        <>
                          {freeSubmitted && embedFreeLastCorrect !== null && !embedOnHome ? (
                            <p
                              className={`px-6 text-center text-base font-semibold ${embedFreeLastCorrect ? 'text-[#22c55e]' : 'text-coral'}`}
                            >
                              {embedFreeLastCorrect ? 'Correct!' : 'Keep going!'}
                            </p>
                          ) : null}

                          <div
                            className={`shrink-0 border-t border-white/10 bg-[#0a3b89]/75 px-3 sm:px-6 ${homeQuizChrome ? 'py-1.5 sm:py-2' : 'py-2 sm:py-3'}`}
                          >
                            {freeReplayLocked ? (
                              <Button
                                type="button"
                                onClick={() => void handleFreeAdvanceFromReplay()}
                                disabled={trivia.loading}
                                aria-label="Load next free trivia question"
                                className={`w-full rounded-full font-semibold ${
                                  homeQuizChrome
                                    ? 'px-5 py-2 text-xs sm:px-8 sm:py-2.5 sm:text-sm'
                                    : 'px-6 py-2.5 text-sm sm:px-10 sm:py-3 sm:text-base'
                                }`}
                              >
                                {trivia.loading ? 'Loading…' : 'Next question'}
                              </Button>
                            ) : (
                              <Button
                                onClick={handleSubmitFree}
                                disabled={
                                  !trivia.selectedAnswer ||
                                  !trivia.selectedOptionText ||
                                  trivia.isSubmitted ||
                                  trivia.loading
                                }
                                className={`w-full rounded-full font-semibold ${
                                  homeQuizChrome
                                    ? 'px-5 py-2 text-xs sm:px-8 sm:py-2.5 sm:text-sm'
                                    : 'px-6 py-2.5 text-sm sm:px-10 sm:py-3 sm:text-base'
                                }`}
                              >
                                {trivia.loading
                                  ? 'Submitting…'
                                  : trivia.isSubmitted
                                    ? 'Next question…'
                                    : 'Submit'}
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              ) : (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={(question as BronzeSilverModeQuestion).question_id ?? 'bs'}
                    role="group"
                    aria-live="polite"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                    className="flex min-h-0 flex-1 flex-col overflow-hidden pb-0"
                  >
                    <div
                      className={
                        homeQuizChrome
                          ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
                          : 'min-h-0 flex-1 overflow-y-auto scrollbar-overlay'
                      }
                    >
                      <div className={`mx-3 rounded-2xl sm:mx-6 ${homeQuizChrome ? 'shrink-0 p-2 sm:p-3' : 'p-3 sm:p-5'}`}>
                        <p
                          className={`text-center font-bold leading-snug text-white break-words ${
                            homeQuizChrome ? 'text-sm sm:text-base' : 'text-base sm:text-lg md:text-xl'
                          }`}
                        >
                          {(question as BronzeSilverModeQuestion).question}
                        </p>
                        {!homeQuizChrome && (question as BronzeSilverModeQuestion).hint ? (
                          <p className="mt-2 text-center text-xs text-cloud sm:mt-3 sm:text-sm">
                            Hint: {(question as BronzeSilverModeQuestion).hint}
                          </p>
                        ) : null}
                      </div>

                      <div
                        className={`grid px-3 sm:px-6 ${homeQuizChrome ? 'shrink-0 gap-1.5 pb-2 sm:gap-2' : 'gap-2 pb-3 sm:gap-3'}`}
                      >
                        {options.map((o) => (
                          <OptionButton
                            key={o.id}
                            label={o.id.toUpperCase()}
                            text={o.text}
                            state={embedOptionState(o.id)}
                            compact={homeQuizChrome}
                            disabled={Boolean(trivia.loading || bronzeSilverAnswered)}
                            onClick={() => handleBronzeSilverSelect(o.id, o.text)}
                          />
                        ))}
                      </div>
                    </div>
                    {!bronzeSilverAnswered ? (
                      <div
                        className={`shrink-0 border-t border-white/10 bg-[#0a3b89]/75 px-3 sm:px-6 ${homeQuizChrome ? 'py-1.5 sm:py-2' : 'py-2 sm:py-3'}`}
                      >
                        <Button
                          onClick={handleSubmitBronzeSilver}
                          disabled={
                            !trivia.selectedAnswer ||
                            !trivia.selectedOptionText ||
                            trivia.isSubmitted ||
                            trivia.loading
                          }
                          className={`w-full rounded-full font-semibold ${
                            homeQuizChrome
                              ? 'px-5 py-2 text-xs sm:px-8 sm:py-2.5 sm:text-sm'
                              : 'px-6 py-2.5 text-sm sm:px-10 sm:py-3 sm:text-base'
                          }`}
                        >
                          {trivia.loading ? 'Submitting…' : 'Submit'}
                        </Button>
                      </div>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </section>
        ) : (
          <>
            {mode === 'free' ? (
              <div
                className="flex flex-col gap-2 touch-pan-y sm:gap-3"
                onTouchStart={onFreeReplayTouchStart}
                onTouchEnd={onFreeReplayTouchEnd}
              >
                <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-white/10 to-transparent p-4 sm:p-6">
                  <p className="text-xs uppercase tracking-wide text-white/60">{question.category}</p>
                  <h4 className="mt-2 font-display text-lg leading-snug text-white sm:text-xl">{question.question}</h4>
                  {question.hint ? <p className="mt-3 text-sm text-amber-100/90">Hint: {question.hint}</p> : null}
                  {freeReplayLocked ? (
                    <>
                      <p className="mt-2 text-sm font-semibold text-amber-200/90">
                        Already answered
                        {(question as FreeModeQuestion).is_correct === true
                          ? ' · Correct'
                          : (question as FreeModeQuestion).is_correct === false
                            ? ' · Incorrect'
                            : ''}
                      </p>
                      <p className="mt-1 text-center text-xs text-white/60">Swipe left for next, or use the button.</p>
                    </>
                  ) : null}
                </div>

                <div className="grid gap-2 sm:gap-3">
                  {options.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      disabled={
                        (!freeModeReviewMode && (trivia.isSubmitted || freeReplayLocked)) ||
                        trivia.loading ||
                        freeModeReviewMode
                      }
                      className={optionClass(o.id)}
                      onClick={() => {
                        if (!freeModeReviewMode) handleFreeSelect(o.id, o.text)
                      }}
                    >
                      <span className="mr-2 font-bold uppercase text-white/50">{o.id}.</span>
                      {o.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-white/10 to-transparent p-4 sm:p-6">
                  <p className="text-xs uppercase tracking-wide text-white/60">{question.category}</p>
                  <h4 className="mt-2 font-display text-lg leading-snug text-white sm:text-xl">{question.question}</h4>
                  {question.hint ? <p className="mt-3 text-sm text-amber-100/90">Hint: {question.hint}</p> : null}
                </div>

                <div className="grid gap-2 sm:gap-3">
                  {options.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      disabled={bronzeSilverAnswered || trivia.loading || freeModeReviewMode}
                      className={optionClass(o.id)}
                      onClick={() => {
                        if (!freeModeReviewMode) handleBronzeSilverSelect(o.id, o.text)
                      }}
                    >
                      <span className="mr-2 font-bold uppercase text-white/50">{o.id}.</span>
                      {o.text}
                    </button>
                  ))}
                </div>
                {!bronzeSilverAnswered ? (
                  <div className="flex flex-col items-center gap-2 pt-2">
                    <Button
                      className="min-w-[200px] px-8 py-3 text-base font-semibold"
                      disabled={
                        !trivia.selectedAnswer ||
                        !trivia.selectedOptionText ||
                        trivia.isSubmitted ||
                        trivia.loading
                      }
                      onClick={handleSubmitBronzeSilver}
                    >
                      {trivia.loading ? 'Submitting…' : 'Submit'}
                    </Button>
                  </div>
                ) : null}
              </>
            )}

            {mode === 'free' && !freeModeReviewMode ? (
              <div className="flex flex-col items-center gap-2 pt-2">
                {freeReplayLocked ? (
                  <Button
                    type="button"
                    className="min-w-[200px] px-8 py-3 text-base font-semibold"
                    disabled={trivia.loading}
                    onClick={() => void handleFreeAdvanceFromReplay()}
                    aria-label="Load next free trivia question"
                  >
                    {trivia.loading ? 'Loading…' : 'Next question'}
                  </Button>
                ) : (
                  <Button
                    className="min-w-[200px] px-8 py-3 text-base font-semibold"
                    disabled={
                      !trivia.selectedAnswer ||
                      !trivia.selectedOptionText ||
                      trivia.isSubmitted ||
                      trivia.loading
                    }
                    onClick={handleSubmitFree}
                  >
                    {trivia.loading ? 'Submitting…' : 'Submit'}
                  </Button>
                )}
              </div>
            ) : null}
          </>
        )
      ) : null}

      {!question &&
      !loadingQuestion &&
      !err &&
      initialized &&
      !(mode === 'free' && freeModeReviewMode && sortedFreeQuestions.length > 0) ? (
        <p className="text-center text-sm text-white/70">
          {mode === 'free' && hasAttemptedAnyFree ? 'No more questions right now.' : 'No question available.'}
        </p>
      ) : null}
    </div>
  )
}
