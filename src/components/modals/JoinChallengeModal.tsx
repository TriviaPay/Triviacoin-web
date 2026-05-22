import CloseIcon from '../ui/CloseIcon'

type Props = {
  visible: boolean
  onClose: () => void
  onRefer: () => void
}

const JoinChallengeModal = ({ visible, onClose, onRefer }: Props) => {
  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      aria-label="Close"
    >
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-gradient-to-b from-[#1e3a8a] to-[#0c3c89] p-4 text-white shadow-2xl border border-white/20 sm:p-6"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-white/10 transition"
          aria-label="Close"
        >
          <CloseIcon className="h-6 w-6" />
        </button>

        <h3 className="type-modal-title font-bold text-center mb-4 text-[#ffd66b] text-safe">
          Join Challenge
        </h3>

        <p className="text-white/90 text-center type-body-sm sm:text-fluid-base mb-6 leading-relaxed">
          Invite your friends to join the challenge and earn rewards together! Share the app with others
          and get amazing in-game benefits.
        </p>

        <button
          onClick={onRefer}
          className="w-full py-3.5 rounded-xl bg-gradient-to-b from-[#ffd66b] to-[#f3a011] text-[#7c4c00] font-bold text-fluid-lg shadow-glow hover:brightness-110 transition sm:py-4"
        >
          Refer a Friend
        </button>
      </div>
    </div>
  )
}

export default JoinChallengeModal
