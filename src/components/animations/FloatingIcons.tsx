import { motion } from 'framer-motion'

const QuestionMarkIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10" aria-hidden>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
  </svg>
)

const CommentIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10" aria-hidden>
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
  </svg>
)

const icons = [
  { Icon: QuestionMarkIcon, pos: { top: '12%', left: '6%' } },
  { Icon: CommentIcon, pos: { top: '30%', left: '18%' } },
  { Icon: QuestionMarkIcon, pos: { top: '18%', right: '10%' } },
  { Icon: CommentIcon, pos: { top: '52%', right: '6%' } },
  { Icon: QuestionMarkIcon, pos: { bottom: '8%', left: '16%' } },
  { Icon: CommentIcon, pos: { top: '65%', left: '8%' } },
]

const FloatingIcons = () => (
  <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
    {icons.map(({ Icon, pos }, index) => (
      <motion.span
        key={index}
        className="absolute text-white/20"
        style={pos}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5 + index, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Icon />
      </motion.span>
    ))}
  </div>
)

export default FloatingIcons
