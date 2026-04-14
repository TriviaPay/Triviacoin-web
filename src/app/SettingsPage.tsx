import { setSound, navigate, toggleNotifications, setSupportModalOpen } from '../store/uiSlice'
import { logout } from '../store/authSlice'
import Button from '../components/ui/Button'
import { useState, useCallback, useEffect } from 'react'
import { useDescope } from '@descope/react-sdk'
import { FAQ_DATA, type FAQItem } from '../constants/settingsFaq'
import { apiService, type NativeAppVersionsPayload } from '../services/apiService'
import clsx from 'clsx'
import { useOnboarding } from '../components/Onboarding/useOnboarding'

const STORAGE_NOTIFICATIONS = 'ui.notificationsEnabled'

const SettingsPage = () => {
  const { startTour } = useOnboarding()
  const dispatch = useAppDispatch()
  const soundEnabled = useAppSelector((s) => s.ui.soundEnabled)
  const notificationsEnabled = useAppSelector((s) => s.ui.notificationsEnabled)
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const sessionToken = useAppSelector((s) => s.auth.token)
  const apiToken = sessionToken && sessionToken.trim() ? sessionToken : null
  const userEmail = useAppSelector((s) => s.auth.user?.email ?? '')
  const descope = useDescope()

  const [logoutModalOpen, setLogoutModalOpen] = useState(false)

  const [faqItems, setFaqItems] = useState<FAQItem[]>(() => [...FAQ_DATA])
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)
  const [allFAQsExpanded, setAllFAQsExpanded] = useState(false)

  const [nativeAppVersions, setNativeAppVersions] = useState<NativeAppVersionsPayload | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_NOTIFICATIONS, String(notificationsEnabled))
    } catch {
      /* ignore */
    }
  }, [notificationsEnabled])


  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const res = await apiService.fetchFaqs(apiToken)
      if (cancelled) return
      if (res.success && res.data && typeof res.data === 'object') {
        const raw = res.data as { faqs?: unknown[] }
        const list = Array.isArray(raw.faqs) ? raw.faqs : []
        const mapped: FAQItem[] = list
          .map((x) => {
            if (!x || typeof x !== 'object') return null
            const o = x as Record<string, unknown>
            const q = String(o.question ?? '').trim()
            const a = String(o.answer ?? '').trim()
            if (!q || !a) return null
            return { question: q, answer: a }
          })
          .filter((x): x is FAQItem => x != null)
        setFaqItems(mapped.length > 0 ? mapped : [...FAQ_DATA])
      } else {
        setFaqItems([...FAQ_DATA])
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [apiToken])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const payload = await apiService.getLatestNativeAppVersions(apiToken)
      if (cancelled) return
      setNativeAppVersions(payload)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [apiToken])

  const handleLogout = useCallback(async () => {
    setLogoutModalOpen(false)
    try {
      if ((descope as { logout?: () => Promise<unknown> })?.logout) {
        try {
          await (descope as { logout: () => Promise<unknown> }).logout()
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }
    dispatch(logout())
    dispatch(navigate('home'))
  }, [dispatch, descope])

  const handleToggleNotifications = useCallback(() => {
    const willEnable = !notificationsEnabled
    dispatch(toggleNotifications())
    if (willEnable && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        void Notification.requestPermission()
      }
    }
  }, [dispatch, notificationsEnabled])

  const toggleFAQ = (index: number) => {
    setExpandedFAQ((prev) => (prev === index ? null : index))
  }

  const toggleAllFAQs = () => {
    setAllFAQsExpanded((v) => !v)
    setExpandedFAQ(null)
  }

  const handleOpenSupport = () => {
    if (userEmail) setSupportEmail(userEmail)
    setSupportModalOpen(true)
  }

  const handleCloseSupport = () => {
    setSupportModalOpen(false)
    setSupportDescription('')
  }

  const handleSupportSubmit = async () => {
    const email = supportEmail.trim()
    if (!email) {
      window.alert('Please enter your email address')
      return
    }
    const desc = supportDescription.trim()
    if (!desc) {
      window.alert('Please enter a description of your request')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      window.alert('Please enter a valid email address')
      return
    }

    setIsSubmittingSupport(true)
    try {
      await new Promise((r) => setTimeout(r, 800))
      window.alert('Your support request has been submitted. We will get back to you soon!')
      handleCloseSupport()
    } catch {
      window.alert('Failed to submit support request. Please try again.')
    } finally {
      setIsSubmittingSupport(false)
    }
  }

  const supportDisabled =
    isSubmittingSupport || !supportEmail.trim() || !supportDescription.trim()

  return (
    <section className="section-card rounded-3xl bg-quiz-panel text-white">
      <div className="mx-auto w-full max-w-4xl space-y-5 px-3 py-5 sm:space-y-6 sm:px-5 sm:py-6 md:px-8 md:py-8">
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <ToggleRow
            label="Notifications"
            enabled={notificationsEnabled}
            onToggle={handleToggleNotifications}
          />
          <ToggleRow
            label="Sound"
            enabled={soundEnabled}
            onToggle={() => dispatch(setSound(!soundEnabled))}
          />
        </div>

        {/* FAQs */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 md:p-6">
          <button
            type="button"
            onClick={toggleAllFAQs}
            className="flex w-full items-center justify-between gap-3 rounded-xl py-2 text-left text-base font-bold text-[#93c5fd] transition hover:text-white sm:text-lg"
            aria-expanded={allFAQsExpanded}
          >
            <span>Frequently Asked Questions</span>
            <ChevronIcon up={allFAQsExpanded} className="shrink-0 text-[#93c5fd]" />
          </button>

          {allFAQsExpanded && (
            <ul className="mt-3 space-y-0 border-t border-white/10 pt-3">
              {faqItems.map((faq, index) => {
                const isOpen = expandedFAQ === index
                return (
                  <li key={`${index}-${faq.question.slice(0, 48)}`} className="border-b border-white/10 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => toggleFAQ(index)}
                      className="flex w-full items-start justify-between gap-3 py-3 text-left sm:py-4"
                      aria-expanded={isOpen}
                    >
                      <span className="flex-1 text-sm font-medium text-white/95 sm:text-base">
                        {faq.question}
                      </span>
                      <ChevronIcon up={isOpen} className="mt-0.5 shrink-0 text-white/60" />
                    </button>
                    {isOpen && (
                      <p className="pb-3 pl-0 text-sm leading-relaxed text-white/70 sm:text-[0.9375rem] md:max-w-3xl">
                        {faq.answer}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={() => dispatch(setSupportModalOpen(true))}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563eb] px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1d4ed8] sm:py-4 sm:text-base"
        >
          <HeadsetIcon className="h-5 w-5 shrink-0" />
          Customer Support
        </button>

        {/* About */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 md:p-6">
          <h3 className="text-base font-semibold text-white sm:text-lg">About</h3>
          {(() => {
            const rows =
              nativeAppVersions?.platforms.filter((p) => {
                const o = p.os.toLowerCase()
                return o === 'ios' || o === 'iphone' || o === 'android'
              }) ?? []
            rows.sort((a, b) => {
              const order = (x: string) => (x.toLowerCase() === 'android' ? 1 : 0)
              return order(a.os) - order(b.os)
            })
            if (rows.length === 0) return null
            return (
              <div className="mt-3 space-y-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 sm:mt-4 sm:px-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Apps</p>
                {rows.map((p) => {
                  const o = p.os.toLowerCase()
                  const label = o === 'android' ? 'Android' : 'iOS'
                  return (
                    <p key={p.os} className="text-sm text-white/80">
                      <span className="font-medium text-white">{label}</span>
                      <span className="text-white/50"> · </span>
                      <span className="tabular-nums">{p.latest_version}</span>
                    </p>
                  )
                })}
              </div>
            )
          })()}
          <button
            type="button"
            onClick={() => startTour({ force: true })}
            className="mt-4 w-full rounded-xl border border-[#ffd66b]/40 bg-[#ffd66b]/10 px-4 py-3 text-sm font-semibold text-[#ffd66b] transition hover:bg-[#ffd66b]/20 sm:text-base"
          >
            Replay welcome tour
          </button>
          <p className="mt-3 text-sm leading-relaxed text-white/65 sm:text-base">
            This app is designed to provide a fun and engaging experience for users to earn rewards and
            play games.
          </p>
          <p className="mt-3 text-sm text-white/65 sm:text-base">admin@miragaming.com</p>
        </div>

        {isAuthenticated && (
          <button
            type="button"
            onClick={() => setLogoutModalOpen(true)}
            className="w-full rounded-2xl border border-red-500/50 bg-red-500/40 px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/60 sm:text-base"
          >
            Logout
          </button>
        )}
      </div>

      {logoutModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setLogoutModalOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#1450b1] to-[#0c3c89] p-6 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
          >
            <h3 id="logout-title" className="mb-2 text-xl font-bold">
              Logout
            </h3>
            <p className="mb-6 text-sm text-white/85">Are you sure you want to logout?</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setLogoutModalOpen(false)}
                className="flex-1 rounded-xl bg-white/20 py-3 font-semibold transition hover:bg-white/30"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 rounded-xl bg-red-500 py-3 font-semibold transition hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

const ToggleRow = ({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) => (
  <div className="flex min-h-[52px] items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-3 sm:min-h-[56px]">
    <span className="text-sm sm:text-base">{label}</span>
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      className={clsx(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition',
        enabled ? 'bg-[#ffd66b]' : 'bg-white/30'
      )}
    >
      <span
        className={clsx(
          'inline-block h-5 w-5 transform rounded-full bg-white transition',
          enabled ? 'translate-x-5' : 'translate-x-1'
        )}
      />
    </button>
  </div>
)

function ChevronIcon({ up, className }: { up: boolean; className?: string }) {
  return (
    <svg
      className={clsx('h-5 w-5 transition-transform sm:h-6 sm:w-6', up && '-rotate-180', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function HeadsetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export default SettingsPage
