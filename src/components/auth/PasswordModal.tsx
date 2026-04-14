import React from 'react'

export interface PasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

type Props = {
  visible: boolean
  onClose: () => void
  passwordData: PasswordData
  setPasswordData: (data: PasswordData) => void
  showPasswordField?: boolean
  setShowPasswordField?: (show: boolean) => void
  updatePassword: () => void
}

const fieldClasses =
  'w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm placeholder-white/60 focus:border-[#ffd66b] focus:bg-white/15 outline-none transition-all text-white'

const PasswordModal: React.FC<Props> = ({
  visible,
  onClose,
  passwordData,
  setPasswordData,
  updatePassword,
}) => {
  const handleInputChange = (field: keyof PasswordData, value: string) => {
    setPasswordData({ ...passwordData, [field]: value })
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-md rounded-xl bg-gradient-to-b from-[#1450b1] to-[#0c3c89] p-5 text-white shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-modal-title"
      >
        <h2 id="password-modal-title" className="mb-5 text-center text-lg font-bold">
          Change Password
        </h2>

        <div className="mb-4">
          <label className="mb-2 block text-base font-medium">Current Password</label>
          <input
            type="password"
            className={fieldClasses}
            value={passwordData.currentPassword}
            onChange={(e) => handleInputChange('currentPassword', e.target.value)}
            placeholder="Enter current password"
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-base font-medium">New Password</label>
          <input
            type="password"
            className={fieldClasses}
            value={passwordData.newPassword}
            onChange={(e) => handleInputChange('newPassword', e.target.value)}
            placeholder="Enter new password"
          />
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-base font-medium">Confirm New Password</label>
          <input
            type="password"
            className={fieldClasses}
            value={passwordData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            placeholder="Confirm new password"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            className="flex-1 rounded-lg bg-white/15 py-3 text-center text-base font-medium text-white hover:bg-white/25"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg bg-gradient-to-b from-[#ffd66b] to-[#f3a011] py-3 text-center text-base font-medium text-[#7c4c00] hover:brightness-110"
            onClick={updatePassword}
          >
            Update Password
          </button>
        </div>
      </div>
    </div>
  )
}

export default PasswordModal
