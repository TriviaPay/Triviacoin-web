/** Detect Lottie / animation URLs (same rules as ChatAvatar). */
export function isLottieUrl(u: string | null | undefined): boolean {
  if (!u || typeof u !== 'string') return false
  const lower = u.toLowerCase()
  return lower.includes('.json') || lower.includes('.lottie') || lower.includes('lottiefiles.com')
}

type RawProfile = Record<string, unknown>

function str(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

/** Flatten API wrappers so avatar can live on `profile`, `user`, or the root. */
function mergeProfileRoots(raw: Record<string, any>): Record<string, any> {
  const profile = raw.profile
  const user = raw.user
  return {
    ...raw,
    ...(profile && typeof profile === 'object' ? profile : {}),
    ...(user && typeof user === 'object' ? user : {}),
  }
}

/** `avatar` may be a URL string or an object (url / image_url / nested image). */
function stringFromAvatarField(avatar: unknown): string {
  if (avatar == null) return ''
  if (typeof avatar === 'string') return str(avatar)
  if (typeof avatar === 'object') {
    const o = avatar as Record<string, unknown>
    const direct = str(o.url) || str(o.image_url) || str(o.lottie_url) || str(o.src)
    if (direct) return direct
    const im = o.image
    if (typeof im === 'string') return str(im)
    if (im && typeof im === 'object') return str((im as { url?: string }).url)
  }
  return ''
}

/**
 * Split API profile into Lottie URL vs static image for ChatAvatar.
 * Accepts common shapes: profile_picture, profilepic, avatar (string or {url}),
 * camelCase fields, nested profile/user, etc.
 */
export function resolveProfileDisplayMedia(raw: RawProfile | null | undefined): {
  avatarUrl: string | null
  profilePicUrl: string | null
} {
  if (!raw) return { avatarUrl: null, profilePicUrl: null }

  const d = mergeProfileRoots(raw as Record<string, any>)

  const customUpload =
    d.profile_pic_type === 'custom' && d.profile_pic_url ? str(d.profile_pic_url) : ''

  const profilePicture =
    customUpload ||
    str(d.profile_picture) ||
    str(d.profilePicture) ||
    str(d.profilepicture) ||
    str(d.profile_pic) ||
    str(d.profile_pic_url) ||
    str(d.profilePicUrl) ||
    str(d.profile_image) ||
    str(d.profileImageUrl) ||
    str(d.picture) ||
    str(d.photo) ||
    str(d.photo_url)

  const fromAvatar = stringFromAvatarField(d.avatar)
  const avatarFlat = str(d.avatar_url) || str(d.avatarUrl)

  const ordered = [fromAvatar, avatarFlat, profilePicture].filter(Boolean)
  const seen = new Set<string>()
  const uniqOrdered: string[] = []
  for (const u of ordered) {
    if (!seen.has(u)) {
      seen.add(u)
      uniqOrdered.push(u)
    }
  }

  let avatarUrl: string | null = null
  for (const u of uniqOrdered) {
    if (isLottieUrl(u)) {
      avatarUrl = u
      break
    }
  }

  let profilePicUrl: string | null = null
  if (customUpload && !isLottieUrl(customUpload)) profilePicUrl = customUpload
  else if (profilePicture && !isLottieUrl(profilePicture)) profilePicUrl = profilePicture
  else if (fromAvatar && !isLottieUrl(fromAvatar)) profilePicUrl = fromAvatar
  else if (avatarFlat && !isLottieUrl(avatarFlat)) profilePicUrl = avatarFlat

  return { avatarUrl, profilePicUrl }
}
