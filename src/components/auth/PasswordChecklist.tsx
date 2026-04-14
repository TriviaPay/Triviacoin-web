import React from 'react'
import clsx from 'clsx'

const rules = [
  { key: 'len', label: '8+ characters', test: (v: string) => v.length >= 8 },
  { key: 'upper', label: '1 uppercase', test: (v: string) => /[A-Z]/.test(v) },
  { key: 'lower', label: '1 lowercase', test: (v: string) => /[a-z]/.test(v) },
  { key: 'num', label: '1 number', test: (v: string) => /\d/.test(v) },
  { key: 'special', label: '1 special (!@#$%^&*)', test: (v: string) => /[^a-zA-Z0-9]/.test(v) },
]

type Props = { value: string; visible?: boolean }

const PasswordChecklist: React.FC<Props> = ({ value, visible = true }) => {
  if (!visible) return null
  return (
    <div className="space-y-1 rounded-xl bg-white/5 p-3 text-sm text-white">
      {rules.map((rule) => {
        const ok = rule.test(value)
        return (
          <div key={rule.key} className="flex items-center gap-2">
            <span
              className={clsx(
                'flex h-5 w-5 items-center justify-center rounded-full text-xs',
                ok ? 'bg-green-500 text-white' : 'bg-white/20 text-white'
              )}
            >
              {ok ? '✔' : '•'}
            </span>
            <span className={clsx(ok ? 'text-white' : 'text-white/70')}>{rule.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export const passwordIsValid = (value: string) => rules.every((r) => r.test(value))

export default PasswordChecklist

