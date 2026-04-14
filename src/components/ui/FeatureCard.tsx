import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: string
  icon: ReactNode
  onClick?: () => void
}

const FeatureCard = ({ title, description, icon, onClick }: Props) => (
  <motion.div
    whileHover={{ y: -6, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-b from-[#124caa] to-[#0c3c89] p-5 sm:p-6 text-center shadow-[0_14px_26px_rgba(0,0,0,0.25)] border border-[#0b347c] hover:shadow-glow"
  >
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/18 drop-shadow-glow overflow-hidden">
      {icon}
    </div>
    <div className="font-display text-lg font-semibold text-white">{title}</div>
    {description ? <p className="text-sm text-slate">{description}</p> : null}
  </motion.div>
)

export default FeatureCard
