import type { ComponentProps, ReactNode } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'

type Variant = 'primary' | 'secondary' | 'ghost'

type Props = Omit<ComponentProps<typeof motion.button>, 'children'> & {
  children: ReactNode
  variant?: Variant
  full?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-[#ffeb99] via-[#ffd54f] to-[#f9a825] text-[#5d3a00] shadow-[0_6px_0_#d4890a,0_10px_25px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.5)] border border-[#ffcc33] hover:brightness-105 hover:shadow-[0_4px_0_#d4890a,0_8px_20px_rgba(0,0,0,0.25)] active:shadow-[0_2px_0_#d4890a] active:translate-y-[2px]',
  secondary:
    'bg-gradient-to-b from-[#7ec8ff] via-[#4a9eff] to-[#1a7de8] text-white shadow-[0_6px_0_#0c5fc4,0_10px_25px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.3)] border border-[#5bb8ff]/80 hover:brightness-110 hover:shadow-[0_4px_0_#0c5fc4,0_8px_20px_rgba(0,0,0,0.25)] active:shadow-[0_2px_0_#0c5fc4] active:translate-y-[2px]',
  ghost: 'bg-white/14 text-white border border-white/25 backdrop-blur hover:bg-white/18 shadow-[0_4px_12px_rgba(0,0,0,0.15)]',
}

const Button = ({ children, variant = 'primary', full, className, disabled, ...rest }: Props) => {
  const base =
    'pill-button inline-flex items-center justify-center gap-2 px-6 py-3 font-bold uppercase tracking-wide rounded-full transition-all duration-150'
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.03 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={twMerge(clsx(base, variantClasses[variant], full && 'w-full', disabled && 'opacity-60'), className)}
      disabled={disabled}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

export default Button
