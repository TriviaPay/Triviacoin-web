import { useState, useEffect } from 'react'

type Props = {
  isEditing: boolean
  fullName: string
  onChangeName: (text: string) => void
  /** Display in chip below name - use first name (not username) */
  firstName?: string
  badgeImageUrl?: string
  subscriptionBadges?: Array<{ id: string; image_url: string }>
  totalGems?: number
  totalTriviaCoins?: number
  level?: number
  levelProgress?: string
  onCopyUsername?: (username: string) => void
}

const parseLevelProgress = (levelProgress?: string) => {
  if (!levelProgress) return { current: 0, max: 100 }
  const parts = levelProgress.split('/')
  if (parts.length === 2) {
    const current = parseInt(parts[0], 10) || 0
    const max = parseInt(parts[1], 10) || 100
    return { current, max }
  }
  return { current: 0, max: 100 }
}

const ProfileInfo = ({
  isEditing,
  fullName,
  onChangeName,
  firstName,
  badgeImageUrl,
  subscriptionBadges = [],
  totalGems: _totalGems = 0,
  totalTriviaCoins: _totalTriviaCoins = 0,
  level,
  levelProgress,
  onCopyUsername,
}: Props) => {
  const [copiedUsername, setCopiedUsername] = useState(false)
  const levelProgressData = parseLevelProgress(levelProgress)
  const levelProgressPercentage =
    levelProgressData.max > 0 ? (levelProgressData.current / levelProgressData.max) * 100 : 0

  useEffect(() => {
    if (copiedUsername) {
      const t = setTimeout(() => setCopiedUsername(false), 2000)
      return () => clearTimeout(t)
    }
  }, [copiedUsername])

  const handleCopy = () => {
    if (firstName) {
      navigator.clipboard?.writeText(firstName)
      setCopiedUsername(true)
      onCopyUsername?.(firstName)
    }
  }

  return (
    <div className="w-full max-w-[300px] mt-5 sm:mt-6 flex flex-col items-center">
      {isEditing ? (
        <input
          type="text"
          value={fullName}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="Name"
          maxLength={15}
          className="w-full text-center text-base sm:text-lg font-bold text-white bg-white/20 border border-white rounded-2xl px-3 py-1.5 mb-1 placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#ffd66b]"
        />
      ) : null}
      {!isEditing && firstName && (
        <div className="flex items-center mt-1 gap-1">
          <div className="flex items-center border border-white/30 rounded-2xl px-3 py-1.5 bg-white/10">
            <span className="text-sm sm:text-base font-bold text-white">
              {firstName}
            </span>
            {subscriptionBadges?.length > 0 ? (
              <div className="flex flex-row items-center gap-0.5 ml-1">
                {subscriptionBadges.map((b) => (
                  <img key={b.id} src={b.image_url} alt="" className="w-5 h-5 object-contain" />
                ))}
              </div>
            ) : badgeImageUrl ? (
              <img src={badgeImageUrl} alt="" className="w-5 h-5 ml-1 object-contain" />
            ) : null}
          </div>
          <button
            onClick={handleCopy}
            className="p-1 ml-1 rounded-lg bg-white/15 hover:bg-white/25 transition"
          >
            {copiedUsername ? (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h2a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      )}
      {(level !== undefined || levelProgress) && (
        <div className="mt-3 px-6 w-full">
          {level !== undefined && (
            <p className="text-sm sm:text-base font-semibold text-white mb-2">Level {level}</p>
          )}
          {levelProgress && (
            <div>
              <div className="flex items-center w-full gap-2">
                <div className="flex-1 h-3 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#ffd66b] to-[#f3a011] rounded-full transition-all"
                    style={{ width: `${levelProgressPercentage}%` }}
                  />
                </div>
                <svg className="w-5 h-5 text-[#ffd66b] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-white/80">Questions Answered Correctly</span>
                <span className="text-xs text-white/80">
                  {levelProgressData.current}/{levelProgressData.max}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ProfileInfo
