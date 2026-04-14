type Props = {
  visible: boolean
  imageUrl: string | null
  onClose: () => void
}

const ProfilePictureViewModal = ({ visible, imageUrl, onClose }: Props) => {
  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      aria-label="Close"
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Profile"
            className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl"
          />
        ) : (
          <div className="flex h-64 w-64 items-center justify-center rounded-2xl bg-white/10 text-white/60">
            No image
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfilePictureViewModal
