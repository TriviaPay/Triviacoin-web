import Button from '../ui/Button'

type Props = {
  open: boolean
  isCorrect: boolean
  title?: string
  message: string
  onClose: () => void
  /** 'panel' = cover only the quiz panel area (parent must be relative + sized). */
  overlay?: 'viewport' | 'panel'
}

export default function TriviaResultModal({ open, isCorrect, title, message, onClose, overlay = 'viewport' }: Props) {
  if (!open) return null

  const overlayClass =
    overlay === 'panel' ? 'absolute inset-0 z-[80] rounded-2xl' : 'fixed inset-0 z-[100]'

  return (
    <div
      className={`${overlayClass} flex min-h-0 flex-col bg-quiz-panel text-white`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="trivia-result-title"
    >
      <div className="flex justify-end px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2.5 text-2xl leading-none text-white/90 transition hover:bg-white/10"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-8 pt-2 text-center sm:px-10">
        <h2 id="trivia-result-title" className="font-display text-3xl text-white sm:text-4xl">
          {title ?? (isCorrect ? 'Correct!' : 'Incorrect')}
        </h2>
        {message ? <p className="mt-6 max-w-md text-base leading-relaxed text-white/85 sm:text-lg">{message}</p> : null}
        <Button className="mt-10 w-full max-w-sm py-3 text-base font-semibold" onClick={onClose}>
          Continue
        </Button>
      </div>
    </div>
  )
}
