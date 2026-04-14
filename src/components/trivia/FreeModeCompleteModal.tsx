import type { FreeModeQuestion, FreeModeStatusResponse } from '../../store/triviaSlice'
import Button from '../ui/Button'

type Props = {
  open: boolean
  status: FreeModeStatusResponse | null
  questions: FreeModeQuestion[] | null
  variant?: 'complete' | 'summary'
  onDismiss: () => void
  onReviewAnswers: () => void
  /** 'panel' = cover only the quiz panel area (parent must be relative + sized). 'viewport' = full window. */
  overlay?: 'viewport' | 'panel'
  /** Same content as the modal, but a normal card in the layout (e.g. home embed). */
  inline?: boolean
}

function normalizeFillAnswer(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.length > 0) {
    const last = value[value.length - 1]
    if (last && typeof last === 'object' && 'user_answer' in (last as object)) {
      return String((last as { user_answer?: string }).user_answer ?? '')
    }
  }
  return null
}

function resolveAnswerText(value: string | null | undefined, q: FreeModeQuestion): string {
  const raw = normalizeFillAnswer(value as unknown) ?? (typeof value === 'string' ? value : null)
  if (!raw) return '—'
  const normalized = String(raw).toLowerCase().trim()
  if (normalized === 'a') return q.option_a
  if (normalized === 'b') return q.option_b
  if (normalized === 'c') return q.option_c
  if (normalized === 'd') return q.option_d
  return String(raw)
}

/** Inline / shared list for free-mode “attempts today” (also used inside the completion modal). */
export function FreeModeSummaryList({ questions }: { questions: FreeModeQuestion[] | null }) {
  const list = questions ? [...questions].sort((a, b) => (a.question_order ?? 0) - (b.question_order ?? 0)) : []
  if (list.length === 0) {
    return <p className="text-center text-sm text-white/60">Loading…</p>
  }
  return (
    <ul className="mx-auto flex max-w-2xl flex-col gap-3 pb-2">
      {list.map((q, idx) => {
        const ok = q.is_correct === true
        const label = q.is_correct == null ? '—' : ok ? 'Correct' : 'Incorrect'
        const color =
          q.is_correct == null
            ? 'border-white/25 text-white/60'
            : ok
              ? 'border-emerald-400/60 text-emerald-200'
              : 'border-red-400/60 text-red-200'
        return (
          <li
            key={q.question_id ?? idx}
            className="rounded-2xl border border-white/15 bg-white/5 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.2)] backdrop-blur-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-white">Question {idx + 1}</span>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs ${color}`}>{label}</span>
            </div>
            <p className="mt-3 text-sm leading-snug text-white/95">{q.question}</p>
            <p className="mt-3 text-xs text-white/65">Your answer: {resolveAnswerText(q.fill_in_answer as string | null, q)}</p>
            <p className="mt-1 text-xs text-white/65">Correct: {resolveAnswerText(q.correct_answer, q)}</p>
          </li>
        )
      })}
    </ul>
  )
}

export default function FreeModeCompleteModal({
  open,
  status,
  questions,
  variant = 'complete',
  onDismiss,
  onReviewAnswers,
  overlay = 'viewport',
  inline = false,
}: Props) {
  if (!open) return null

  const score =
    typeof status?.progress?.correct_answers === 'number' && typeof status?.progress?.total_questions === 'number'
      ? `${status.progress.correct_answers}/${status.progress.total_questions}`
      : ''

  const title = variant === 'summary' ? 'Your answers' : 'Congratulations'
  const subtitle = variant === 'summary' ? 'Attempts today' : 'Free mode complete'

  const overlayClass =
    overlay === 'panel'
      ? 'absolute inset-0 z-[80] rounded-2xl'
      : 'fixed inset-0 z-[100]'

  const body = (
    <>
      <header
        className={`flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 pb-3 sm:px-6 sm:pb-4 ${inline ? 'pt-2' : 'pt-[max(1rem,env(safe-area-inset-top))]'}`}
      >
        <div className="min-w-0 flex-1 pt-1">
          <h2 id="free-mode-modal-title" className="font-display text-2xl text-white sm:text-3xl">
            {title}
          </h2>
          {subtitle ? <p className="mt-1 text-sm text-white/70">{subtitle}</p> : null}
          {score ? <p className="mt-2 text-sm font-semibold text-amber-200/95">Score {score}</p> : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-full p-2.5 text-2xl leading-none text-white/90 transition hover:bg-white/10"
          aria-label="Close"
        >
          ×
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
        <FreeModeSummaryList questions={questions} />
      </div>

      <footer
        className={`shrink-0 border-t border-white/10 bg-[#0a3b89]/90 px-4 py-4 backdrop-blur-sm sm:px-6 ${inline ? 'pb-4' : 'pb-[max(1rem,env(safe-area-inset-bottom))]'}`}
      >
        <Button className="mx-auto w-full max-w-md py-3 text-base font-semibold" onClick={onReviewAnswers}>
          Review answers
        </Button>
      </footer>
    </>
  )

  if (inline) {
    return (
      <div
        className="flex min-h-0 flex-col rounded-3xl border border-white/15 bg-quiz-panel text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        role="region"
        aria-labelledby="free-mode-modal-title"
      >
        {body}
      </div>
    )
  }

  return (
    <div
      className={`${overlayClass} flex min-h-0 flex-col bg-quiz-panel text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="free-mode-modal-title"
    >
      {body}
    </div>
  )
}
