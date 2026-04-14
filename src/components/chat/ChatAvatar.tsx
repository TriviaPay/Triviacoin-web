import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import { getLottieJsonFetchUrl } from '../../utils/lottieAssetUrl'
import { isLottieUrl } from '../../utils/profileDisplayMedia'

type Props = {
  senderAvatarUrl?: string | null
  senderProfilePic?: string | null
  profilePic?: string | null
  avatarUrl?: string | null
  alt?: string
  size?: number
  fallbackSrc?: string
  className?: string
  /** Chat bubbles use circles; shop cards use rounded squares (same Lottie + image logic). */
  variant?: 'circle' | 'rounded'
}

/**
 * Renders avatar: Lottie (.json) when load succeeds, else profile image / fallback.
 * Matches mobile: avatar_url first, then profile_pic (placeholder while Lottie loads).
 */
const ChatAvatar = ({
  senderAvatarUrl,
  senderProfilePic,
  profilePic,
  avatarUrl,
  alt = 'Avatar',
  size = 24,
  fallbackSrc,
  className = '',
  variant = 'circle',
}: Props) => {
  const round = variant === 'rounded' ? 'rounded-2xl' : 'rounded-full'
  const imgFit = variant === 'rounded' ? 'object-contain' : 'object-cover'
  const [LottieComp, setLottieComp] = useState<ComponentType<any> | null>(null)
  const [lottieData, setLottieData] = useState<object | null>(null)
  const [lottieFailed, setLottieFailed] = useState(false)
  const [imgError, setImgError] = useState(false)

  const lottieUrl = [senderAvatarUrl, avatarUrl].find((u) => u && String(u).trim()) ?? null
  const trimmedLottie = lottieUrl ? String(lottieUrl).trim() : null
  const profileImageUrl =
    [senderProfilePic, profilePic].find((u) => u && String(u).trim())?.toString().trim() ?? null
  const isLottie = isLottieUrl(trimmedLottie ?? undefined)

  useEffect(() => {
    if (!isLottie || !trimmedLottie) return
    setLottieFailed(false)
    setLottieData(null)
    let mounted = true
    const fetchUrl = getLottieJsonFetchUrl(trimmedLottie)
    fetch(fetchUrl, { credentials: 'omit' })
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed')
        return r.json()
      })
      .then((data) => {
        if (mounted && data && typeof data === 'object') setLottieData(data)
      })
      .catch(() => {
        if (mounted) setLottieFailed(true)
      })
    return () => {
      mounted = false
    }
  }, [trimmedLottie, isLottie])

  useEffect(() => {
    if (!isLottie || !lottieData) return
    let mounted = true
    import('lottie-react').then((mod) => {
      if (mounted) {
        const anyMod = mod as any
        const candidate =
          (typeof anyMod === 'function' && anyMod) ||
          (typeof anyMod?.default === 'function' && anyMod.default) ||
          (typeof anyMod?.default?.default === 'function' && anyMod.default.default) ||
          (typeof anyMod?.Lottie === 'function' && anyMod.Lottie)
        if (candidate) setLottieComp(() => candidate)
      }
    })
    return () => {
      mounted = false
    }
  }, [isLottie, lottieData])

  useEffect(() => {
    setImgError(false)
  }, [profileImageUrl, trimmedLottie])

  const style = { width: size, height: size, minWidth: size, minHeight: size }

  const lottieReady = Boolean(isLottie && lottieData && LottieComp)

  if (lottieReady && LottieComp) {
    return (
      <div
        className={`overflow-hidden ${round} bg-white/10 flex items-center justify-center ${className}`}
        style={style}
      >
        <LottieComp
          animationData={lottieData}
          loop
          style={style}
          rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
        />
      </div>
    )
  }

  const staticUrl =
    profileImageUrl ||
    (!isLottie && trimmedLottie) ||
    null

  if (staticUrl && !imgError) {
    return (
      <img
        src={staticUrl}
        alt={alt}
        className={`${round} ${imgFit} ${className}`}
        style={style}
        onError={() => setImgError(true)}
      />
    )
  }

  if (isLottie && !lottieFailed && !profileImageUrl && trimmedLottie) {
    return (
      <div
        className={`${round} bg-white/15 flex items-center justify-center text-white text-xs font-semibold animate-pulse ${className}`}
        style={style}
      >
        {alt?.[0]?.toUpperCase() ?? '?'}
      </div>
    )
  }

  if (fallbackSrc && !imgError) {
    return (
      <img
        src={fallbackSrc}
        alt={alt}
        className={`${round} ${imgFit} ${className}`}
        style={style}
      />
    )
  }

  return (
    <div
      className={`${round} bg-white/20 flex items-center justify-center text-white text-xs font-semibold ${className}`}
      style={style}
    >
      {alt?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

export default ChatAvatar
