import { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/store'
import { setSupportModalOpen } from '../../store/uiSlice'
import Button from '../ui/Button'
import clsx from 'clsx'

const SupportModal = () => {
  const dispatch = useAppDispatch()
  const visible = useAppSelector((s) => s.ui.supportModalOpen)
  const user = useAppSelector((s) => s.auth.user)
  const userEmail = user?.email ?? ''

  const [supportEmail, setSupportEmail] = useState(userEmail)
  const [supportDescription, setSupportDescription] = useState('')
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false)

  useEffect(() => {
    if (visible && userEmail) {
      setSupportEmail(userEmail)
    }
  }, [visible, userEmail])

  if (!visible) return null

  const handleCloseSupport = () => {
    dispatch(setSupportModalOpen(false))
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

  const supportDisabled = isSubmittingSupport || !supportEmail.trim() || !supportDescription.trim()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleCloseSupport}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-gradient-to-b from-[#1450b1] to-[#0c3c89] p-5 text-white shadow-2xl sm:p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-title"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 id="support-title" className="text-lg font-bold sm:text-xl font-display">
            Customer Support
          </h3>
          <button
            type="button"
            onClick={handleCloseSupport}
            className="rounded-lg p-2 text-white/80 hover:bg-white/10"
            aria-label="Close"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="support-email" className="mb-1.5 block text-sm font-medium">
              Email <span className="text-red-300">*</span>
            </label>
            <input
              id="support-email"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-[#ffd66b] focus:outline-none focus:ring-2 focus:ring-[#ffd66b]/40 sm:text-base"
              placeholder="Enter your email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              type="email"
              autoComplete="email"
              disabled={isSubmittingSupport}
            />
          </div>
          <div>
            <label htmlFor="support-desc" className="mb-1.5 block text-sm font-medium">
              Request description <span className="text-red-300">*</span>
            </label>
            <textarea
              id="support-desc"
              className="min-h-[120px] w-full resize-y rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-[#ffd66b] focus:outline-none focus:ring-2 focus:ring-[#ffd66b]/40 sm:min-h-[140px] sm:text-base"
              placeholder="Describe your request or issue (max 500 characters)"
              value={supportDescription}
              onChange={(e) => setSupportDescription(e.target.value.slice(0, 500))}
              maxLength={500}
              disabled={isSubmittingSupport}
            />
            <p className="mt-1 text-right text-xs text-white/55">{supportDescription.length}/500</p>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              className={clsx('px-6 py-2.5 text-sm sm:text-base', supportDisabled && 'opacity-50')}
              disabled={supportDisabled}
              onClick={() => void handleSupportSubmit()}
            >
              {isSubmittingSupport ? 'Submitting…' : 'Submit'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export default SupportModal
