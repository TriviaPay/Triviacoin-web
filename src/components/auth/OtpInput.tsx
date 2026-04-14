import React, { useRef, useState, useCallback, useEffect } from 'react'

type Props = {
  length?: number
  onComplete: (code: string) => void | Promise<void>
  onResend?: () => void | Promise<void>
  error?: string
  disabled?: boolean
  resendCountdown?: number
  email?: string
}

const OtpInput: React.FC<Props> = ({
  length = 6,
  onComplete,
  onResend,
  error,
  disabled = false,
  resendCountdown = 0,
  email,
}) => {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const code = digits.join('')
  const allFilled = code.length === length && digits.every((d) => d !== '')

  useEffect(() => {
    if (allFilled) {
      onComplete(code)
    }
  }, [allFilled, code, onComplete])

  const handleChange = useCallback(
    (index: number, value: string) => {
      if (disabled) return
      const char = value.replace(/\D/g, '').slice(-1)
      const next = [...digits]
      next[index] = char
      setDigits(next)
      if (char && index < length - 1) {
        inputRefs.current[index + 1]?.focus()
      }
    },
    [digits, disabled, length]
  )

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && !digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    },
    [digits]
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault()
      if (disabled) return
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
      if (!pasted) return
      const next = [...digits]
      pasted.split('').forEach((char, i) => {
        if (i < length) next[i] = char
      })
      setDigits(next)
      const focusIndex = Math.min(pasted.length, length) - 1
      inputRefs.current[focusIndex]?.focus()
    },
    [digits, disabled, length]
  )

  return (
    <div className="flex flex-col items-center gap-3">
      {email && (
        <p className="text-center text-sm text-white/80">
          Verification code sent to <span className="font-medium">{email}</span>
        </p>
      )}
      <div className="flex gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className="h-12 w-12 rounded-xl border-2 border-white/30 bg-white/10 text-center text-lg font-bold text-white outline-none transition placeholder:text-white/40 focus:border-[#ffd66b] focus:bg-white/15 disabled:opacity-50"
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>
      {error && <p className="text-sm text-[#f55b6a]">{error}</p>}
      {onResend && (
        <button
          type="button"
          disabled={disabled || resendCountdown > 0}
          onClick={onResend}
          className="text-sm font-medium text-white/90 hover:text-white disabled:opacity-50"
        >
          {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend code'}
        </button>
      )}
    </div>
  )
}

export default OtpInput
