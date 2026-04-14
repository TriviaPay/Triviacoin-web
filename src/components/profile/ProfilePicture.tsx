import ChatAvatar from '../chat/ChatAvatar'

type Props = {
  isEditing: boolean
  uploadingImage: boolean
  /** Static image URL (upload or non-Lottie API field). */
  profilePicture: string | null
  /** Lottie / animated avatar URL from API (e.g. avatar.url). */
  avatarUrl?: string | null
  /** Used for initials fallback in ChatAvatar. */
  displayName?: string
  frameUrl: string
  badgeImageUrl: string
  isSubscribed: boolean
  onPressEdit: () => void
  onPressPicture?: () => void
}

const ProfilePicture = ({
  isEditing,
  uploadingImage,
  profilePicture,
  avatarUrl,
  displayName = '',
  frameUrl,
  badgeImageUrl,
  isSubscribed,
  onPressEdit,
  onPressPicture,
}: Props) => {
  const profileSizePx = 112
  const profileSize = `${profileSizePx}px`

  return (
    <div className="flex flex-col items-center justify-center mt-4 sm:mt-6 mb-1">
      <div
        className="relative flex shrink-0 items-center justify-center"
        style={{ width: profileSize, height: profileSize }}
      >
        {uploadingImage ? (
          <div
            className="rounded-full bg-white/15 border border-white/20 flex items-center justify-center animate-pulse"
            style={{ width: profileSize, height: profileSize }}
          >
            <span className="text-white/60 text-sm">Loading...</span>
          </div>
        ) : (
          <>
            {frameUrl ? (
              <div
                className="absolute inset-0 z-0 rounded-full pointer-events-none"
                style={{
                  backgroundImage: `url(${frameUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
                aria-hidden
              />
            ) : null}
            <div
              className="relative z-[1] rounded-full overflow-hidden border-2 border-white/30 bg-white/10 flex items-center justify-center cursor-pointer hover:opacity-90 transition shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
              style={{ width: profileSize, height: profileSize }}
              onClick={isEditing ? undefined : onPressPicture}
            >
              <ChatAvatar
                avatarUrl={avatarUrl ?? null}
                profilePic={profilePicture}
                alt={displayName || 'Profile'}
                size={profileSizePx}
              />
            </div>
            {isSubscribed && badgeImageUrl && (
              <div
                className="absolute top-[11%] right-[11%] w-[25%] h-[25%] z-10"
              >
                <img
                  src={badgeImageUrl}
                  alt="Badge"
                  className="w-full h-full object-contain drop-shadow-glow"
                />
              </div>
            )}
            {isEditing && (
              <button
                onClick={onPressEdit}
                className="absolute bottom-[11%] right-[11%] w-[29%] h-[29%] rounded-full bg-gradient-to-b from-[#ffd66b] to-[#f3a011] flex items-center justify-center z-10 hover:brightness-110 transition shadow-lg text-[#7c4c00]"
              >
                <svg className="w-1/2 h-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ProfilePicture
