import { useState, useEffect } from 'react'

type Props = {
  accountNumber: string
  account_id?: string | number
  email: string
  emailVerified: boolean
  onCopyAccountNumber?: (accountNumber: string) => void
  onChangePassword?: () => void
}

const AccountInfo = ({
  accountNumber,
  account_id,
  email,
  emailVerified,
  onCopyAccountNumber,
  onChangePassword,
}: Props) => {
  const [copiedAccount, setCopiedAccount] = useState(false)

  useEffect(() => {
    if (copiedAccount) {
      const t = setTimeout(() => setCopiedAccount(false), 2000)
      return () => clearTimeout(t)
    }
  }, [copiedAccount])

  const handleCopyAccount = () => {
    const value = accountNumber || String(account_id || '')
    if (value) {
      navigator.clipboard?.writeText(value)
      setCopiedAccount(true)
      onCopyAccountNumber?.(value)
    }
  }

  return (
    <div className="mb-4 rounded-2xl bg-white/10 border border-white/20 px-4 py-4">
      <div className="flex items-center mb-4">
        <div className="w-1 h-6 rounded-sm bg-[#ffd66b] mr-3" />
        <h3 className="text-base sm:text-lg font-bold text-white">Account Information</h3>
      </div>

      <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center mb-2">
          <svg className="w-5 h-5 text-[#ffd66b] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <span className="text-sm font-semibold text-white/80">Account Number / ID</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white flex-1">{accountNumber || account_id || 'N/A'}</span>
          <button onClick={handleCopyAccount} className="p-1 rounded hover:bg-white/10 transition">
            {copiedAccount ? (
              <svg className="w-5 h-5 text-[#4ade80]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white/70 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h2a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center mb-2">
          <svg className="w-5 h-5 text-[#ffd66b] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-semibold text-white/80">Email</span>
        </div>
        <div className="flex justify-between items-center flex-wrap gap-2">
          <span className="text-sm text-white flex-1 min-w-0 truncate">{email || 'N/A'}</span>
          {emailVerified && (
            <span className="flex items-center bg-[#22c55e]/20 text-[#4ade80] px-2 py-1 rounded-full text-xs font-medium border border-[#22c55e]/30">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Verified
            </span>
          )}
        </div>
      </div>

      {onChangePassword && (
        <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
          <button
            onClick={onChangePassword}
            className="text-sm sm:text-base text-white hover:text-[#ffd66b] transition"
          >
            Change Password
          </button>
        </div>
      )}
    </div>
  )
}

export default AccountInfo
