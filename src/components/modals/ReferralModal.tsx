import { useState, useEffect } from 'react'
import { useAppSelector } from '../../store/store'
import { apiService } from '../../services/apiService'
import Button from '../ui/Button'

type Props = {
  visible: boolean
  onClose: () => void
}

const ReferralModal = ({ visible, onClose }: Props) => {
  const token = useAppSelector((s) => s.auth.token)
  const [loading, setLoading] = useState(false)
  const [referralData, setReferralData] = useState<{
    referral_code: string
    share_text: string
    app_link: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (visible && token && !referralData) {
      setLoading(true)
      apiService.sendReferral(token).then((res) => {
        setLoading(false)
        if (res.success && res.data) {
          setReferralData(res.data)
        }
      })
    }
  }, [visible, token, referralData])

  const referralLink = referralData?.app_link || 'https://triviacoin.app/join'
  const referralCode = referralData?.referral_code || ''
  const shareText = referralData?.share_text || 'Join me on Trivia Coin and earn rewards!'

  const handleCopy = () => {
    const textToCopy = referralCode || referralLink
    navigator.clipboard?.writeText(textToCopy).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Trivia Coin',
        text: shareText,
        url: referralLink,
      })
    } else {
      handleCopy()
    }
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      aria-label="Close"
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-gradient-to-b from-[#1e3a8a] to-[#0c3c89] p-6 text-white shadow-2xl border border-white/20"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-white/10 transition"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="font-display text-2xl font-bold text-center mb-2 text-[#ffd66b]">
          Refer a Friend
        </h3>

        <p className="text-white/80 text-center text-sm mb-6">
          Share your referral code and earn rewards when friends join!
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ffd66b] border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col items-center justify-center rounded-xl bg-white/10 border border-white/20 p-4">
              <span className="text-xs uppercase tracking-wider text-white/60 mb-1">Your Code</span>
              <span className="text-3xl font-black tracking-widest text-[#ffd66b]">
                {referralCode || '-------'}
              </span>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-sm text-white truncate"
              />
              <Button onClick={handleCopy} className="px-4 py-2.5 shrink-0">
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>

            <Button onClick={handleShare} className="w-full py-3">
              Share Link
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default ReferralModal
