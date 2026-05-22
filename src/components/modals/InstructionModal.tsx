import { AnimatePresence, motion } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '../../store/store'
import { closeInstructions } from '../../store/uiSlice'
import Button from '../ui/Button'

const InstructionModal = () => {
  const dispatch = useAppDispatch()
  const open = useAppSelector((s) => s.ui.instructionsOpen)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => dispatch(closeInstructions())}
        >
          <motion.div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-gradient-to-b from-[#0f4ca8] to-[#0c3c89] p-4 text-white shadow-[0_20px_40px_rgba(0,0,0,0.35)] sm:p-6"
            initial={{ y: 30, scale: 0.95, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 10, scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="type-modal-title mb-2 text-safe">Choose a Mode</h3>
            <p className="type-body-sm text-white/80">
              Pick Free, $5, $10, $15, or $20. Each game has 10 questions, 30s per question, no skips. The timer starts
              when you enter the mode.
            </p>
            <ul className="mt-3 space-y-1 type-body-sm text-white/80 list-disc list-inside">
              <li>Answer fast to keep your streak.</li>
              <li>Rewards scale with entry amount.</li>
              <li>You can exit anytime; progress is saved per mode.</li>
            </ul>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" className="w-full sm:w-auto" onClick={() => dispatch(closeInstructions())}>
                Got it
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default InstructionModal
