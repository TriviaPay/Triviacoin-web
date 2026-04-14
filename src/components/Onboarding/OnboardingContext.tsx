import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import { useAppDispatch, useAppSelector } from '../../store/store'
import { navigate } from '../../store/uiSlice'
const StepOverlay = lazy(() => import('./StepOverlay'))
import { ONBOARDING_STEPS } from './onboardingSteps'
import { hasCompletedOnboarding, markOnboardingComplete, clearOnboardingFlag } from './onboardingStorage'

type Rect = { top: number; left: number; width: number; height: number }

type OnboardingContextValue = {
  /** Start or replay the product tour (clears completion flag if replay). */
  startTour: (opts?: { force?: boolean }) => void
  dismissTour: () => void
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider')
  return ctx
}

function useMediaMobile() {
  const [m, setM] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const fn = () => setM(mq.matches)
    fn()
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return m
}

function findVisibleTourElement(target: string): HTMLElement | null {
  const nodes = document.querySelectorAll(`[data-tour="${target}"]`)
  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue
    const r = node.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) return node
  }
  return null
}

function useStepTargetRect(target: string | undefined, active: boolean, stepIndex: number) {
  const [rect, setRect] = useState<Rect | null>(null)

  useLayoutEffect(() => {
    if (!active || !target) {
      setRect(null)
      return
    }
    const el = findVisibleTourElement(target)
    if (!el) {
      setRect(null)
      return
    }
    const measure = () => {
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [active, target, stepIndex])

  return rect
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const currentPage = useAppSelector((s) => s.ui.currentPage)
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const isMobile = useMediaMobile()

  const steps = ONBOARDING_STEPS
  const step = steps[stepIndex] ?? steps[0]
  const target = step.placement === 'center' ? undefined : step.target
  const targetRect = useStepTargetRect(target, active, stepIndex)

  const ensureHomeForStep = useCallback(
    (idx: number) => {
      const t = steps[idx]?.target
      if (
        t &&
        ['tour-sidebar-quiz', 'tour-winners', 'tour-start-quiz'].includes(t) &&
        currentPage !== 'home'
      ) {
        dispatch(navigate('home'))
      }
    },
    [currentPage, dispatch, steps],
  )

  const startTour = useCallback(
    (opts?: { force?: boolean }) => {
      if (opts?.force) {
        clearOnboardingFlag()
        dispatch(navigate('home'))
      } else if (hasCompletedOnboarding()) return
      setStepIndex(0)
      setActive(true)
      ensureHomeForStep(0)
    },
    [dispatch, ensureHomeForStep],
  )

  const dismissTour = useCallback(() => {
    setActive(false)
    markOnboardingComplete()
  }, [])

  useEffect(() => {
    try {
      if (sessionStorage.getItem('trivia_onboarding_boot_v1') === '1') return
      sessionStorage.setItem('trivia_onboarding_boot_v1', '1')
    } catch {
      /* ignore */
    }
    if (hasCompletedOnboarding()) return
    const id = window.requestAnimationFrame(() => {
      setStepIndex(0)
      setActive(true)
    })
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (!active) return
    ensureHomeForStep(stepIndex)
  }, [active, stepIndex, ensureHomeForStep])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissTour()
      if (e.key === 'Enter' && !e.repeat) {
        if (stepIndex >= steps.length - 1) dismissTour()
        else setStepIndex((i) => i + 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, dismissTour, stepIndex, steps.length])

  const onNext = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      dismissTour()
      return
    }
    setStepIndex((i) => i + 1)
  }, [dismissTour, stepIndex, steps.length])

  const onBack = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1))
  }, [])

  const onSkip = useCallback(() => {
    dismissTour()
  }, [dismissTour])

  const value = useMemo(
    () => ({
      startTour,
      dismissTour,
    }),
    [startTour, dismissTour],
  )

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <StepOverlay
          open={active}
          step={step}
          stepIndex={stepIndex}
          totalSteps={steps.length}
          targetRect={targetRect}
          isMobile={isMobile}
          onNext={onNext}
          onBack={onBack}
          onSkip={onSkip}
        />
      </Suspense>
    </OnboardingContext.Provider>
  )
}
