import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface InfoTooltipProps {
  content: string | React.ReactNode
  className?: string
}

const InfoTooltip = ({ content, className = '' }: InfoTooltipProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onMouseEnter={() => {
          if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
            setIsOpen(true)
          }
        }}
        onMouseLeave={() => {
          if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
            setIsOpen(false)
          }
        }}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
        aria-label="More information"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute left-1/2 top-full z-[100] mt-3 w-64 -translate-x-1/2 rounded-xl border border-white/10 bg-[#0b2a6c] p-3 text-[11px] leading-relaxed text-cloud shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-md sm:w-72 sm:text-xs"
          >
            {content}
            {/* Arrow */}
            <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t border-white/10 bg-[#0b2a6c]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default InfoTooltip
