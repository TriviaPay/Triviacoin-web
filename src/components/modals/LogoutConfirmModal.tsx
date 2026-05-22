import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'

type Props = {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}

/** Centered logout dialog — portaled to body; flex center (avoids transform conflicts with motion). */
export default function LogoutConfirmModal({ open, onCancel, onConfirm }: Props) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="nav-logout-title"
            className="relative z-10 w-full max-w-[20rem] rounded-2xl border border-white/20 bg-gradient-to-b from-[#1450b1] to-[#0c3c89] p-5 text-white shadow-2xl"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="nav-logout-title" className="type-modal-title font-bold text-safe">
              Logout
            </h3>
            <p className="mt-2 type-body-sm text-white/85">Are you sure you want to log out?</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-xl border border-white/20 bg-white/10 py-2.5 text-sm font-semibold hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 rounded-xl bg-gradient-to-b from-[#ffd66b] to-[#f3a011] py-2.5 text-sm font-bold text-[#7c4c00]"
              >
                Log out
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
