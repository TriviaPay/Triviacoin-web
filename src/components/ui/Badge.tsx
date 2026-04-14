import type { ReactNode } from 'react'
import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'

type Props = {
  children: ReactNode
  className?: string
}

const Badge = ({ children, className }: Props) => (
  <span className={twMerge(clsx('badge bg-white/15 text-sm text-white shadow-inner', className))}>{children}</span>
)

export default Badge
