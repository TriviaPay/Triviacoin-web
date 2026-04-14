import { useRef, useEffect, useState } from 'react'
import { apiService } from '../../services/apiService'
import ChatAvatar from '../chat/ChatAvatar'

type Props = {
  visible: boolean
  onClose: () => void
  onSelectImage: (url: string) => void
  onRemoveImage: () => void
  token: string | null
}

const ProfilePictureModal = ({
  visible,
  onClose,
  onSelectImage,
  onRemoveImage,
  token,
}: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [avatars, setAvatars] = useState<Array<{ id: string; name?: string; url?: string }>>([])
  const [avatarsLoading, setAvatarsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'upload' | 'avatars'>('upload')

  useEffect(() => {
    if (visible && token && activeTab === 'avatars') {
      setAvatarsLoading(true)
      apiService
        .fetchOwnedAvatars(token)
        .then((res) => {
          if (res.success && res.data) setAvatars(res.data)
          else setAvatars([])
        })
        .catch(() => setAvatars([]))
        .finally(() => setAvatarsLoading(false))
    }
  }, [visible, token, activeTab])

  const handleGalleryClick = () => fileInputRef.current?.click()
  const handleCameraClick = () => cameraInputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, _isCamera: boolean) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      onSelectImage(url)
      onClose()
    }
    e.target.value = ''
  }

  const handleSelectAvatar = (avatar: { id: string; url?: string }) => {
    if (avatar.url) {
      onSelectImage(avatar.url)
      onClose()
    }
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-gradient-to-b from-[#1450b1] to-[#0c3c89] p-6 text-white shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Change Profile Picture</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex gap-2 mb-4 rounded-xl bg-white/10 p-1">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'upload' ? 'bg-white/20 text-white' : 'text-white/70'
            }`}
          >
            Upload
          </button>
          <button
            onClick={() => setActiveTab('avatars')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'avatars' ? 'bg-white/20 text-white' : 'text-white/70'
            }`}
          >
            Avatars
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileChange(e, false)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => handleFileChange(e, true)}
        />

        {activeTab === 'upload' && (
          <div className="space-y-3">
            <button
              onClick={handleGalleryClick}
              className="w-full flex items-center gap-3 rounded-xl bg-white/15 border border-white/20 px-4 py-3 text-left font-semibold hover:bg-white/25 transition"
            >
              <span className="text-2xl">🖼️</span>
              <span>Upload from Gallery</span>
            </button>
            <button
              onClick={handleCameraClick}
              className="w-full flex items-center gap-3 rounded-xl bg-white/15 border border-white/20 px-4 py-3 text-left font-semibold hover:bg-white/25 transition"
            >
              <span className="text-2xl">📷</span>
              <span>Take Photo</span>
            </button>
            <button
              onClick={() => {
                onRemoveImage()
                onClose()
              }}
              className="w-full flex items-center gap-3 rounded-xl bg-red-500/30 border border-red-400/40 px-4 py-3 text-left font-semibold hover:bg-red-500/40 transition"
            >
              <span className="text-2xl">🗑️</span>
              <span>Remove Photo</span>
            </button>
          </div>
        )}

        {activeTab === 'avatars' && (
          <div className="space-y-4">
            {avatarsLoading ? (
              <div className="py-8 text-center text-white/70">Loading avatars...</div>
            ) : avatars.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                {avatars.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleSelectAvatar(a)}
                    className="aspect-square rounded-xl overflow-hidden border-2 border-white/20 hover:border-[#ffd66b] transition bg-white/10"
                  >
                    {a.url ? (
                      <div className="flex h-full w-full items-center justify-center bg-white/10">
                        <ChatAvatar avatarUrl={a.url} alt={a.name || 'Avatar'} size={88} variant="rounded" />
                      </div>
                    ) : (
                      <span className="flex items-center justify-center h-full text-2xl">
                        {a.name?.[0] || '?'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-white/70">No avatars available</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfilePictureModal
