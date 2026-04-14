import React from 'react'

type Props = {
  visible: boolean
  onClose: () => void
  onLogin: () => void
  onForgotPassword?: () => void
  identifier: string
  identifierType: 'email' | 'username'
}

const ExistingUserPopup: React.FC<Props> = ({
  visible,
  onClose,
  onLogin,
  onForgotPassword,
  identifier,
  identifierType,
}) => {
  if (!visible) return null

  const label = identifierType === 'email' ? 'Email' : 'Username'
  const message =
    identifierType === 'email'
      ? 'This email is already registered. Would you like to sign in instead?'
      : 'This username is already taken. Would you like to sign in with your email instead?'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-md rounded-xl bg-gradient-to-b from-[#1450b1] to-[#0c3c89] p-5 text-white shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="existing-user-title"
      >
        <h2 id="existing-user-title" className="mb-2 text-center text-lg font-bold">
          {label} Already Exists
        </h2>
        <p className="mb-4 text-center text-sm text-white/90">{message}</p>
        <p className="mb-4 truncate rounded-lg bg-white/10 px-3 py-2 text-sm font-medium">
          {identifier}
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="w-full rounded-lg bg-gradient-to-b from-[#ffd66b] to-[#f3a011] py-3 text-center text-base font-semibold text-[#7c4c00] hover:brightness-110"
            onClick={onLogin}
          >
            Go to Sign In
          </button>
          {onForgotPassword && (
            <button
              type="button"
              className="w-full rounded-lg bg-white/15 py-3 text-center text-base font-medium text-white hover:bg-white/25"
              onClick={onForgotPassword}
            >
              Forgot Password?
            </button>
          )}
          <button
            type="button"
            className="w-full rounded-lg bg-transparent py-2 text-center text-sm text-white/70 hover:text-white"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExistingUserPopup
