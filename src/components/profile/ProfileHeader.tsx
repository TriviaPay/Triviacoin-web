type Props = {
  isEditing: boolean
  isSaving?: boolean
  goBack?: () => void
  toggleEdit: () => void
  cancelEdit: () => void
  onSave: () => void | Promise<void>
  handleLogout?: () => void
}

const ProfileHeader = ({ isEditing, isSaving, toggleEdit, cancelEdit, onSave }: Props) => {
  return (
    <div className="flex items-center justify-end px-4 sm:px-6 py-3 sm:py-4">
      {!isEditing ? (
        <button
          onClick={toggleEdit}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/20 hover:bg-white/30 transition"
          aria-label="Edit profile"
          title="Edit profile"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span className="text-sm font-semibold text-white hidden sm:inline">Edit</span>
        </button>
      ) : (
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={cancelEdit}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-full bg-white/15 border border-white/20 hover:bg-white/25 transition text-white text-sm font-semibold"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="hidden sm:inline">Cancel</span>
          </button>
          <button
            onClick={() => onSave()}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-full bg-gradient-to-b from-[#ffd66b] to-[#f3a011] text-[#7c4c00] font-bold hover:brightness-110 transition shadow-glow disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="hidden sm:inline">{isSaving ? 'Saving…' : 'Save'}</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default ProfileHeader
