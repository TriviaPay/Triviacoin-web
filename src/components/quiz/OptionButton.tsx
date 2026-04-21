import { motion } from 'framer-motion'
import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'
import { CheckIcon } from '../icons/TriviaIcons'

export type OptionState = 'default' | 'selected' | 'correct' | 'wrong'

type Props = {
  label: string
  text: string
  state: OptionState
  onClick: () => void
  disabled?: boolean
  /** Shorter rows for home / daily panel so 4 options + submit fit without scrolling */
  compact?: boolean
}

const OptionButton = ({ label, text, state, onClick, disabled, compact }: Props) => {
  const palette: Record<OptionState, string> = {
    default:
      'bg-gradient-to-b from-white to-[#e9f1ff] text-[#0b2a6c] border border-[#cdd9ff] shadow-[0_10px_20px_rgba(0,0,0,0.12)]',
    selected:
      'bg-gradient-to-b from-[#fff7ed] to-[#ffedd5] text-[#9a3412] border-2 border-[#f97316] shadow-[0_0_15px_rgba(249,115,22,0.25)] ring-2 ring-[#f97316]/20',
    correct:
      'bg-gradient-to-b from-[#22c55e] to-[#16a34a] text-white border border-[#15803d] shadow-[0_14px_26px_rgba(34,197,94,0.45)]',
    wrong:
      'bg-gradient-to-b from-[#ffbac2] to-[#f55b6a] text-white border border-[#e05260] shadow-[0_14px_26px_rgba(245,91,106,0.35)]',
  }

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : compact ? 1 : 1.01 }}
      animate={state === 'wrong' ? { x: [0, -6, 6, -4, 4, 0] } : { opacity: 1, x: 0 }}
      transition={{ duration: state === 'wrong' ? 0.35 : 0.2, ease: 'easeOut' }}
      onClick={onClick}
      disabled={disabled}
      className={twMerge(
        clsx(
          'flex w-full items-center justify-between rounded-pill text-left font-semibold transition-all duration-200',
          compact
            ? 'gap-2 px-3 py-1.5 text-xs sm:gap-2.5 sm:px-3.5 sm:py-2 sm:text-sm'
            : 'gap-3 px-4 py-3 text-base',
          'hover:-translate-y-[1px]',
          palette[state],
          disabled && 'cursor-not-allowed opacity-70',
        ),
      )}
    >
      <span
        className={twMerge(
          'flex shrink-0 items-center justify-center rounded-full bg-white/70 font-display text-[#0b2a6c] shadow-inner',
          compact ? 'h-7 w-7 text-xs sm:h-8 sm:w-8 sm:text-sm' : 'h-9 w-9 text-lg',
        )}
      >
        {label}
      </span>
      <span className={clsx('flex-1 break-words', compact ? 'text-xs sm:text-sm' : 'text-base')}>{text}</span>
      {state === 'correct' && <span className="flex items-center text-white"><CheckIcon /></span>}
      {state === 'wrong' && <span className="text-lg">✖️</span>}
    </motion.button>
  )
}

export default OptionButton
