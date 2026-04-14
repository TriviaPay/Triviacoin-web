import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { OnboardingStep } from './onboardingSteps'
import HandPointer from './HandPointer'

type Rect = { top: number; left: number; width: number; height: number }

type Props = {
  open: boolean
  step: OnboardingStep
  stepIndex: number
  totalSteps: number
  targetRect: Rect | null
  isMobile: boolean
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

function padRect(r: Rect, pad: number): Rect {
  return {
    top: r.top - pad,
    left: r.left - pad,
    width: r.width + pad * 2,
    height: r.height + pad * 2,
  }
}

export default function StepOverlay({
  open,
  step,
  stepIndex,
  totalSteps,
  targetRect,
  isMobile,
  onNext,
  onBack,
  onSkip,
}: Props) {
  const padding = 10
  const hole = useMemo(() => (targetRect ? padRect(targetRect, padding) : null), [targetRect])

  const tooltipPosition = useMemo(() => {
    if (!open) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' as const }
    if (!hole) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' as const }
    }
    const margin = 16
    const vw = typeof window !== 'undefined' ? window.innerWidth : 400
    const vh = typeof window !== 'undefined' ? window.innerHeight : 600
    const preferBottom = step.placement !== 'top' && hole.top + hole.height + 220 < vh
    const tooltipW = Math.min(360, vw - margin * 2)

    if (preferBottom) {
      let left = hole.left + hole.width / 2 - tooltipW / 2
      left = Math.max(margin, Math.min(left, vw - tooltipW - margin))
      const top = Math.min(hole.top + hole.height + margin, vh - margin - 160)
      return { top, left, transform: 'none' as const, width: tooltipW }
    }
    let left = hole.left + hole.width / 2 - tooltipW / 2
    left = Math.max(margin, Math.min(left, vw - tooltipW - margin))
    const top = Math.max(margin, hole.top - margin - 140)
    return { top, left, transform: 'none' as const, width: tooltipW }
  }, [open, hole, step.placement])

  const handPos = useMemo(() => {
    if (!hole) return { x: 0, y: 0, show: false as const }
    const x = hole.left + hole.width * 0.72
    const y = hole.top + hole.height - 4
    return { x, y, show: true as const }
  }, [hole])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[200]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="presentation"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
            onClick={onSkip}
            onKeyDown={(e) => e.key === 'Escape' && onSkip()}
            aria-hidden
          />

          {hole ? (
            <div
              className="pointer-events-none absolute z-[201] rounded-2xl ring-2 ring-[#ffd66b] ring-offset-2 ring-offset-black/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] transition-shadow"
              style={{
                top: hole.top,
                left: hole.left,
                width: hole.width,
                height: hole.height,
              }}
            />
          ) : null}

          <HandPointer
            x={handPos.x}
            y={handPos.y}
            variant={isMobile ? 'tap' : 'click'}
            visible={Boolean(hole && step.target)}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-step-title"
            aria-describedby="onboarding-step-desc"
            className="fixed z-[203] rounded-2xl border border-white/15 bg-[#0f172a]/95 px-4 py-4 text-white shadow-2xl sm:px-5 sm:py-5"
            style={tooltipPosition}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#ffd66b]/90">
              Step {stepIndex + 1} of {totalSteps}
            </p>
            <h2 id="onboarding-step-title" className="font-display mt-1 text-lg font-bold text-white sm:text-xl">
              {step.title}
            </h2>
            <p id="onboarding-step-desc" className="mt-2 text-sm leading-relaxed text-white/75">
              {step.description}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={onSkip}
                className="rounded-full px-3 py-2 text-sm font-medium text-white/60 underline underline-offset-2 hover:text-white"
              >
                Skip tour
              </button>
              <div className="ml-auto flex gap-2">
                {stepIndex > 0 ? (
                  <button
                    type="button"
                    onClick={onBack}
                    className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    Back
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onNext}
                  className="rounded-full bg-gradient-to-b from-[#ffd66b] to-[#f3a011] px-4 py-2 text-sm font-bold text-[#422006] shadow-md hover:brightness-105"
                >
                  {stepIndex >= totalSteps - 1 ? 'Done' : 'Next'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
