import { useState, useEffect, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../store/store'
import { navigate } from '../store/uiSlice'
import { logout, patchUser, setUserProfileMedia } from '../store/authSlice'
import { setUserBalances } from '../store/shopSlice'
import { apiService } from '../services/apiService'
import ProfileHeader from '../components/profile/ProfileHeader'
import ProfilePicture from '../components/profile/ProfilePicture'
import ProfileInfo from '../components/profile/ProfileInfo'
import AccountInfo from '../components/profile/AccountInfo'
import PersonalDetails, { type Address } from '../components/profile/PersonalDetails'
import CountryPickerModal from '../components/auth/CountryPickerModal'
import DatePickerModal from '../components/auth/DatePickerModal'
import PasswordModal, { type PasswordData } from '../components/auth/PasswordModal'
import ProfilePictureModal from '../components/profile/ProfilePictureModal'
import ProfilePictureViewModal from '../components/profile/ProfilePictureViewModal'
import { resolveProfileDisplayMedia } from '../utils/profileDisplayMedia'

const defaultAddress: Address = {
  street1: '',
  street2: '',
  aptNumber: '',
  city: '',
  state: '',
  country: '',
  zipCode: '',
}

const formatDateForDisplay = (dateString: string) => {
  if (!dateString) return ''
  try {
    const [y, m, d] = dateString.split('-')
    if (y && m && d) return `${m}/${d}/${y}`
    return dateString
  } catch {
    return dateString
  }
}

const formatDateForAPI = (dateString: string) => {
  if (!dateString || dateString.length < 10) return ''
  try {
    const [month, day, year] = dateString.split('/')
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  } catch {
    return dateString
  }
}

function mapProfileSummary(
  d: Record<string, unknown>,
  fallbackEmail?: string
): {
  fullName: string
  firstName: string
  username: string
  email: string
  emailVerified: boolean
  accountNumber: string
  account_id: string
  dob: string
  gender: string
  address: Address
  profilePicture: string | null
  avatarUrl: string | null
} {
  const fullName =
    [d.first_name, d.last_name].filter(Boolean).join(' ') ||
    String(d.full_name ?? d.username ?? '')
  const media = resolveProfileDisplayMedia(d)
  return {
    fullName,
    firstName: String(d.first_name ?? fullName.split(' ')[0] ?? ''),
    username: String(d.username ?? ''),
    email: String(d.email ?? fallbackEmail ?? ''),
    emailVerified: Boolean(d.email_verified ?? false),
    accountNumber: String(d.account_number ?? d.account_id ?? ''),
    account_id: d.account_id != null ? String(d.account_id) : '',
    dob: formatDateForDisplay(String(d.date_of_birth ?? '')),
    gender: String(d.gender ?? ''),
    address: {
      street1: String((d.address as { street_1?: string } | undefined)?.street_1 ?? d.address1 ?? ''),
      street2: String((d.address as { street_2?: string } | undefined)?.street_2 ?? d.address2 ?? ''),
      aptNumber: String(
        (d.address as { suite_or_apt_number?: string } | undefined)?.suite_or_apt_number ?? d.apt_number ?? ''
      ),
      city: String((d.address as { city?: string } | undefined)?.city ?? d.city ?? ''),
      state: String((d.address as { state?: string } | undefined)?.state ?? d.state ?? ''),
      country: String((d.address as { country?: string } | undefined)?.country ?? d.country ?? ''),
      zipCode: String((d.address as { zip?: string } | undefined)?.zip ?? d.zip ?? ''),
    },
    profilePicture: media.profilePicUrl,
    avatarUrl: media.avatarUrl,
  }
}

const ProfilePage = () => {
  const dispatch = useAppDispatch()
  const { token, user, isAuthenticated } = useAppSelector((s) => s.auth)
  const [profileData, setProfileData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState({
    fullName: '',
    firstName: '',
    username: '',
    email: '',
    emailVerified: false,
    accountNumber: '',
    account_id: '',
    dob: '',
    gender: '',
    address: { ...defaultAddress },
    profilePicture: null as string | null,
    avatarUrl: null as string | null,
  })
  const [editedProfile, setEditedProfile] = useState(profile)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const [showProfilePictureModal, setShowProfilePictureModal] = useState(false)
  const [showViewPictureModal, setShowViewPictureModal] = useState(false)
  const [showGenderDropdown, setShowGenderDropdown] = useState(false)
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const applyProfileSummary = useCallback(
    (d: Record<string, unknown>) => {
      const media = resolveProfileDisplayMedia(d)
      dispatch(setUserProfileMedia(media))
      const apiUsername = typeof d.username === 'string' ? d.username.trim() : ''
      dispatch(
        patchUser({
          ...(apiUsername ? { username: apiUsername } : {}),
          ...(typeof d.email === 'string' ? { email: d.email } : {}),
          subscription_badges: Array.isArray(d.subscription_badges) ? d.subscription_badges : undefined,
          recent_draw_earnings:
            typeof d.recent_draw_earnings === 'number' ? d.recent_draw_earnings : undefined,
          ...(typeof d.date_of_birth === 'string' ? { date_of_birth: d.date_of_birth } : {}),
          ...(typeof d.country === 'string' ? { country: d.country } : {}),
        })
      )
      dispatch(
        setUserBalances({
          gems: typeof d.total_gems === 'number' ? d.total_gems : undefined,
          tpcoins: typeof d.total_trivia_coins === 'number' ? d.total_trivia_coins : undefined,
        })
      )
      const mapped = mapProfileSummary(d, user?.email)
      setProfile(mapped)
      setEditedProfile(mapped)
      setProfileData(d)
      return mapped
    },
    [dispatch, user?.email]
  )

  const goBack = useCallback(() => {
    dispatch(navigate('home'))
  }, [dispatch])

  useEffect(() => {
    if (isAuthenticated && token) {
      setLoading(true)
      apiService
        .fetchProfileSummary(token)
        .then((res) => {
          if (res.success && res.data) {
            applyProfileSummary(res.data as Record<string, unknown>)
          } else {
            const fallback = {
              fullName: user?.username || '',
              firstName: user?.username?.split(' ')[0] || '',
              username: user?.username || '',
              email: user?.email || '',
              emailVerified: false,
              accountNumber: '',
              account_id: '',
              dob: '',
              gender: '',
              address: { ...defaultAddress },
              profilePicture: user?.profilePicUrl ?? null,
              avatarUrl: user?.avatarUrl ?? null,
            }
            setProfile(fallback)
            setEditedProfile(fallback)
          }
        })
        .catch(() => {
          const fallback = {
            fullName: user?.username || '',
            firstName: user?.username?.split(' ')[0] || '',
            username: user?.username || '',
            email: user?.email || '',
            emailVerified: false,
            accountNumber: '',
            account_id: '',
            dob: '',
            gender: '',
            address: { ...defaultAddress },
            profilePicture: user?.profilePicUrl ?? null,
            avatarUrl: user?.avatarUrl ?? null,
          }
          setProfile(fallback)
          setEditedProfile(fallback)
        })
        .finally(() => setLoading(false))
    } else {
      setProfile({
        fullName: '',
        firstName: '',
        username: '',
        email: '',
        emailVerified: false,
        accountNumber: '',
        account_id: '',
        dob: '',
        gender: '',
        address: { ...defaultAddress },
        profilePicture: null,
        avatarUrl: null,
      })
      setEditedProfile(profile)
      setLoading(false)
    }
  }, [isAuthenticated, token, user?.email, user?.username, user?.profilePicUrl, user?.avatarUrl, applyProfileSummary])

  const handleLogout = () => setShowLogoutModal(true)
  const confirmLogout = () => {
    setShowLogoutModal(false)
    dispatch(logout())
    dispatch(navigate('home'))
  }

  const [isSaving, setIsSaving] = useState(false)

  const toggleEdit = useCallback(() => {
    if (isEditing) {
      setEditedProfile(profile)
      setIsEditing(false)
    } else {
      setEditedProfile((prev) => ({
        ...prev,
        fullName: prev.fullName || profile.username || profile.fullName,
      }))
      setIsEditing(true)
    }
  }, [isEditing, profile])

  const cancelEdit = useCallback(() => {
    setEditedProfile(profile)
    setIsEditing(false)
    setStatusMessage(null)
  }, [profile])

  const handleSave = useCallback(async () => {
    if (!token) return
    setIsSaving(true)
    setStatusMessage(null)
    try {
      const [firstName, ...lastParts] = (editedProfile.fullName || '').trim().split(/\s+/)
      const lastName = lastParts.join(' ') || ''
      const dobApi = formatDateForAPI(editedProfile.dob || '')
      const addr = editedProfile.address || defaultAddress
      const res = await apiService.updateProfile(token, {
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        gender: editedProfile.gender || undefined,
        date_of_birth: dobApi || undefined,
        street_1: addr.street1 || undefined,
        street_2: addr.street2 || undefined,
        suite_or_apt_number: addr.aptNumber || undefined,
        city: addr.city || undefined,
        state: addr.state || undefined,
        zip: addr.zipCode || undefined,
        country: addr.country || undefined,
      })
      if (res.success) {
        setProfile(editedProfile)
        setIsEditing(false)
        setStatusMessage({ type: 'success', text: 'Profile updated successfully!' })
        setTimeout(() => setStatusMessage(null), 3000)
        const refetch = await apiService.fetchProfileSummary(token)
        if (refetch.success && refetch.data) {
          applyProfileSummary(refetch.data as Record<string, unknown>)
        }
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to update profile' })
      }
    } catch (e) {
      setStatusMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to update profile' })
    } finally {
      setIsSaving(false)
    }
  }, [token, editedProfile, applyProfileSummary])

  const handleChange = useCallback((field: string, value: any) => {
    setEditedProfile((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleSelectProfileImage = useCallback(
    async (url: string, file?: File | Blob) => {
      if (!token) return
      setUploadingImage(true)
      setStatusMessage(null)
      try {
        const isRemoteUrl = /^https?:\/\//i.test(url)
        let uploadFile: File | Blob | null = file ?? null
        if (!uploadFile && url.startsWith('blob:')) {
          const blobRes = await fetch(url)
          uploadFile = await blobRes.blob()
        }

        if (uploadFile) {
          const uploadRes = await apiService.uploadProfilePicture(token, uploadFile)
          if (!uploadRes.success) {
            setStatusMessage({
              type: 'error',
              text: uploadRes.error || 'Failed to upload profile picture. Please try again.',
            })
            return
          }
        } else if (isRemoteUrl) {
          const media = resolveProfileDisplayMedia({
            profile_pic_url: url,
            profile_pic_type: 'custom',
          } as Record<string, unknown>)
          dispatch(setUserProfileMedia(media))
          setEditedProfile((prev) => ({
            ...prev,
            profilePicture: media.profilePicUrl,
            avatarUrl: media.avatarUrl,
          }))
        } else {
          setStatusMessage({ type: 'error', text: 'Could not read the selected image.' })
          return
        }

        const refetch = await apiService.fetchProfileSummary(token)
        if (refetch.success && refetch.data) {
          applyProfileSummary(refetch.data as Record<string, unknown>)
          setStatusMessage({ type: 'success', text: 'Profile picture updated!' })
          setTimeout(() => setStatusMessage(null), 3000)
        } else {
          setStatusMessage({
            type: 'error',
            text: refetch.error || 'Photo saved but profile could not be refreshed.',
          })
        }
      } catch (e) {
        setStatusMessage({
          type: 'error',
          text: e instanceof Error ? e.message : 'Failed to upload profile picture. Please try again.',
        })
      } finally {
        setUploadingImage(false)
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      }
    },
    [token, dispatch, applyProfileSummary]
  )

  const handleRemoveProfileImage = useCallback(() => {
    dispatch(setUserProfileMedia({ avatarUrl: null, profilePicUrl: null }))
    setEditedProfile((prev) => ({ ...prev, profilePicture: null, avatarUrl: null }))
  }, [dispatch])

  const handleAddressChange = useCallback((field: keyof Address, value: string) => {
    setEditedProfile((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }))
  }, [])

  const handleDateSelect = useCallback((dateStr: string) => {
    if (!dateStr || dateStr.length < 10) return
    const [y, m, d] = dateStr.split('-')
    if (y && m && d) handleChange('dob', `${m}/${d}/${y}`)
  }, [handleChange])

  const handleUpdatePassword = useCallback(() => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setStatusMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }
    setShowPasswordModal(false)
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setStatusMessage({ type: 'success', text: 'Password updated (API not wired)' })
  }, [passwordData])

  const badgeImageUrl =
    profileData?.badge?.image_url ||
    profileData?.badge_image_url ||
    'https://www.transparentpng.com/thumb/award-ribbon/yellow-award-ribbon-png-0.png'

  if (!isAuthenticated) {
    return (
      <section
        className="section-card mx-auto max-w-2xl rounded-3xl bg-quiz-panel px-4 py-8 text-center text-white sm:px-8"
        data-tour="tour-profile"
      >
        <p className="text-lg">Please sign in to view your profile.</p>
      </section>
    )
  }

  return (
    <section className="w-full text-white min-h-[calc(100vh-6rem)]" data-tour="tour-profile">
      <ProfileHeader
            isEditing={isEditing}
            isSaving={isSaving}
            goBack={goBack}
            toggleEdit={toggleEdit}
            cancelEdit={cancelEdit}
            onSave={handleSave}
            handleLogout={handleLogout}
      />

      <div className="overflow-y-auto scrollbar-hide max-h-[calc(100vh-80px)]">
        <div className="flex flex-col items-center w-full px-4 sm:px-6 py-6">
            {loading ? (
              <div className="py-12 text-white/70">Loading profile...</div>
            ) : (
              <>
                <ProfilePicture
                  isEditing={isEditing}
                  uploadingImage={uploadingImage}
                  profilePicture={
                    isEditing
                      ? editedProfile.profilePicture ?? profile.profilePicture
                      : profile.profilePicture
                  }
                  avatarUrl={isEditing ? editedProfile.avatarUrl ?? profile.avatarUrl : profile.avatarUrl}
                  displayName={
                    profile.username || profile.fullName || profileData?.username || user?.username || ''
                  }
                  frameUrl={profileData?.frame?.url || ''}
                  badgeImageUrl={badgeImageUrl}
                  isSubscribed={profileData?.avatar?.is_premium ?? false}
                  onPressEdit={() => setShowProfilePictureModal(true)}
                  onPressPicture={() => setShowViewPictureModal(true)}
                />
                <ProfileInfo
                  isEditing={isEditing}
                  fullName={
                    isEditing
                      ? editedProfile.fullName || profile.fullName || profileData?.username || ''
                      : profile.fullName || profileData?.username || ''
                  }
                  firstName={profileData?.first_name || profile.firstName || profile.fullName?.split(' ')[0] || ''}
                  badgeImageUrl={badgeImageUrl}
                  subscriptionBadges={profileData?.subscription_badges || []}
                  totalGems={profileData?.total_gems ?? 0}
                  totalTriviaCoins={profileData?.total_trivia_coins ?? 0}
                  level={profileData?.level ?? 0}
                  levelProgress={profileData?.level_progress ?? '0/100'}
                  onChangeName={(text) => {
                    handleChange('fullName', text)
                    const parts = text.trim().split(' ')
                    handleChange('firstName', parts[0] || '')
                    handleChange('lastName', parts.slice(1).join(' ') || '')
                  }}
                />
              </>
            )}
        </div>

        <div className="w-full px-4 sm:px-6 lg:px-8 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full max-w-7xl mx-auto">
            <AccountInfo
              accountNumber={profile.accountNumber}
              account_id={profile.account_id}
              email={profile.email}
              emailVerified={profile.emailVerified}
              onChangePassword={() => setShowPasswordModal(true)}
            />
            <PersonalDetails
              isEditing={isEditing}
              dob={editedProfile.dob || ''}
              gender={editedProfile.gender || ''}
              address={editedProfile.address || defaultAddress}
              showGenderDropdown={showGenderDropdown}
              toggleGenderDropdown={() => {
                setShowGenderDropdown((v) => !v)
              }}
              toggleCountryListDropdown={() => setShowCountryPicker(true)}
              handleDateSelect={() => setShowCalendar(true)}
              handleGenderSelect={(g) => {
                handleChange('gender', g)
                setShowGenderDropdown(false)
              }}
              handleAddressChange={handleAddressChange}
            />
          </div>

          <div className="w-full max-w-7xl mx-auto mt-4">
            {isEditing && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                <button
                  onClick={cancelEdit}
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 rounded-full bg-white/15 border border-white/20 font-bold text-white hover:bg-white/25 transition disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSave()}
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 rounded-full bg-gradient-to-b from-[#ffd66b] to-[#f3a011] font-bold text-[#7c4c00] hover:brightness-110 transition shadow-glow disabled:opacity-60"
                >
                  {isSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showLogoutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#1450b1] to-[#0c3c89] p-6 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-2">Logout</h3>
            <p className="text-white/85 text-sm mb-6">Are you sure you want to logout?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 rounded-xl bg-white/20 py-3 font-semibold hover:bg-white/30 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 rounded-xl bg-red-500 py-3 font-semibold hover:bg-red-600 transition"
              >
                Logout
              </button>
      </div>
    </div>
        </div>
      )}

      <CountryPickerModal
        open={showCountryPicker}
        selected={editedProfile.address?.country}
        onSelect={(c) => handleAddressChange('country', c)}
        onClose={() => setShowCountryPicker(false)}
      />
      <DatePickerModal
        open={showCalendar}
        value={formatDateForAPI(editedProfile.dob)}
        onSelect={handleDateSelect}
        onClose={() => setShowCalendar(false)}
      />
      <PasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        passwordData={passwordData}
        setPasswordData={setPasswordData}
        updatePassword={handleUpdatePassword}
      />

      <ProfilePictureModal
        visible={showProfilePictureModal}
        onClose={() => setShowProfilePictureModal(false)}
        onSelectImage={handleSelectProfileImage}
        onRemoveImage={handleRemoveProfileImage}
        token={token}
      />

      <ProfilePictureViewModal
        visible={showViewPictureModal}
        imageUrl={profile.profilePicture || profile.avatarUrl}
        onClose={() => setShowViewPictureModal(false)}
      />

      {statusMessage && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl ${
            statusMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          } text-white text-sm font-medium z-50`}
        >
          {statusMessage.text}
    </div>
      )}
  </section>
)
}

export default ProfilePage
