import { useRef, useEffect, useState, useCallback } from 'react'
import { apiService } from '../../services/apiService'
import ChatAvatar from '../chat/ChatAvatar'
import CloseIcon from '../ui/CloseIcon'

type Props = {
  visible: boolean
  onClose: () => void
  onSelectImage: (url: string, file?: File | Blob) => void
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [avatars, setAvatars] = useState<Array<{ id: string; name?: string; url?: string }>>([])
  const [avatarsLoading, setAvatarsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'upload' | 'avatars'>('upload')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraReady(false)
  }, [])

  const closeCamera = useCallback(() => {
    stopCamera()
    setCameraOpen(false)
    setCameraError(null)
  }, [stopCamera])

  useEffect(() => {
    if (!visible) {
      closeCamera()
      setActiveTab('upload')
    }
  }, [visible, closeCamera])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      onSelectImage(url, file)
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

  const startCamera = async () => {
    setCameraError(null)
    setCameraOpen(true)
    setCameraReady(false)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera is not supported in this browser.')
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraReady(true)
      }
    } catch (err) {
      stopCamera()
      setCameraError(err instanceof Error ? err.message : 'Could not open camera.')
    }
  }

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video || !cameraReady) return
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) return
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, w, h)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const captured = new File([blob], 'profile.jpg', { type: 'image/jpeg' })
        const url = URL.createObjectURL(captured)
        closeCamera()
        onSelectImage(url, captured)
        onClose()
      },
      'image/jpeg',
      0.92
    )
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
          <h3 className="type-modal-title font-bold text-safe">
            {cameraOpen ? 'Take Photo' : 'Change Profile Picture'}
          </h3>
          <button
            onClick={() => {
              if (cameraOpen) closeCamera()
              else onClose()
            }}
            className="p-2 rounded-full hover:bg-white/20 transition"
            aria-label="Close"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {cameraOpen ? (
          <div className="space-y-4">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-black/40 ring-1 ring-white/20">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover mirror"
                style={{ transform: 'scaleX(-1)' }}
              />
              {!cameraReady && !cameraError ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
                  Opening camera…
                </div>
              ) : null}
            </div>
            {cameraError ? (
              <p className="rounded-xl bg-red-500/20 px-3 py-2 text-center text-sm text-red-100">{cameraError}</p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeCamera}
                className="flex-1 rounded-xl border border-white/20 bg-white/10 py-3 text-sm font-semibold hover:bg-white/15 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                disabled={!cameraReady}
                className="flex-1 rounded-xl bg-gradient-to-b from-[#ffd66b] to-[#f3a011] py-3 text-sm font-bold text-[#7c4c00] disabled:opacity-50 transition"
              >
                Capture
              </button>
            </div>
          </div>
        ) : (
          <>
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
              onChange={handleFileChange}
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
                  onClick={() => void startCamera()}
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
          </>
        )}
      </div>
    </div>
  )
}

export default ProfilePictureModal
