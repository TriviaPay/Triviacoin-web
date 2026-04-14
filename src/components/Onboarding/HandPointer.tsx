import { motion } from 'framer-motion'

type Props = {
  x: number
  y: number
  variant: 'tap' | 'click'
  visible: boolean
}

/** Lightweight hand / pointer cue — no Lottie. */
export default function HandPointer({ x, y, variant, visible }: Props) {
  if (!visible) return null

  const isTap = variant === 'tap'

  return (
    <motion.div
      className="pointer-events-none fixed z-[202]"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      aria-hidden
    >
      <motion.div
        animate={
          isTap
            ? { y: [0, 6, 0], scale: [1, 0.92, 1] }
            : { x: [0, 4, 0], y: [0, 2, 0], rotate: [0, -6, 0] }
        }
        transition={{ duration: isTap ? 0.9 : 1.1, repeat: Infinity, ease: 'easeInOut' }}
        className="flex flex-col items-center drop-shadow-lg"
      >
        <span className="select-none text-4xl sm:text-5xl">{isTap ? '👆' : '👉'}</span>
        <span
          className={`mt-0.5 h-2 w-2 rounded-full ${isTap ? 'bg-[#ffd66b] animate-ping' : 'bg-white/80'}`}
        />
      </motion.div>
    </motion.div>
  )
}
