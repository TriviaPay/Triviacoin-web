import { createSlice } from '@reduxjs/toolkit'

export type Page =
  | 'home'
  | 'daily'
  | 'leaderboard'
  | 'chats'
  | 'wallet'
  | 'shop'
  | 'checkout'
  | 'profile'
  | 'settings'
export type AuthMode = 'signin' | 'signup' | 'forgot'
export type LeaderboardTier = 'bronze' | 'silver'

type UIState = {
  modalOpen: boolean
  authMode: AuthMode
  currentPage: Page
  selectedGameIndex: number
  leaderboardTier: LeaderboardTier
  activeChatId: string | null
  /** Open private chat with this peer when no conversation id is known yet (e.g. recent winners). */
  pendingChatPeerUserId: number | null
  /** Bumps whenever `openChatWithPeerUserId` runs so ChatsPage effects re-run even for the same user id. */
  pendingChatNonce: number
  instructionsOpen: boolean
  selectedModeName: string
  soundEnabled: boolean
  notificationsEnabled: boolean
  referralModalOpen: boolean
  supportModalOpen: boolean
  chatStatus: {
    unreadMessages: number
    friendRequests: number
    onlineCount: number
  }
}

function loadNotificationsFromStorage(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const v = localStorage.getItem('ui.notificationsEnabled')
    if (v === null) return true
    return v === 'true'
  } catch {
    return true
  }
}

const initialState: UIState = {
  modalOpen: false,
  authMode: 'signin',
  currentPage: 'home',
  selectedGameIndex: 0,
  leaderboardTier: 'bronze',
  activeChatId: null,
  pendingChatPeerUserId: null,
  pendingChatNonce: 0,
  instructionsOpen: false,
  selectedModeName: 'Free',
  soundEnabled: true,
  notificationsEnabled: loadNotificationsFromStorage(),
  referralModalOpen: false,
  supportModalOpen: false,
  chatStatus: {
    unreadMessages: 0,
    friendRequests: 0,
    onlineCount: 0,
  },
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openModal: (state, action: { payload: AuthMode }) => {
      state.modalOpen = true
      state.authMode = action.payload
    },
    setAuthMode: (state, action: { payload: AuthMode }) => {
      state.authMode = action.payload
    },
    closeModal: (state) => {
      state.modalOpen = false
    },
    toggleAuthMode: (state) => {
      state.authMode = state.authMode === 'signin' ? 'signup' : 'signin'
    },
    navigate: (state, action: { payload: Page }) => {
      const from = state.currentPage
      state.currentPage = action.payload
      if (action.payload === 'daily' && from !== 'daily') {
        state.instructionsOpen = true
      }
    },
    setGameIndex: (state, action: { payload: number }) => {
      state.selectedGameIndex = action.payload
    },
    setLeaderboardTier: (state, action: { payload: LeaderboardTier }) => {
      state.leaderboardTier = action.payload
    },
    openChat: (state, action: { payload: string }) => {
      state.activeChatId = action.payload
      state.pendingChatPeerUserId = null
      state.currentPage = 'chats'
    },
    openChatWithPeerUserId: (state, action: { payload: number }) => {
      state.pendingChatPeerUserId = action.payload
      state.activeChatId = null
      state.pendingChatNonce += 1
      state.currentPage = 'chats'
    },
    clearActiveChatId: (state) => {
      state.activeChatId = null
    },
    clearPendingChatPeer: (state) => {
      state.pendingChatPeerUserId = null
    },
    openInstructions: (state) => {
      state.instructionsOpen = true
    },
    closeInstructions: (state) => {
      state.instructionsOpen = false
    },
    setActiveModeName: (state, action: { payload: string }) => {
      state.selectedModeName = action.payload
    },
    toggleSound: (state) => {
      state.soundEnabled = !state.soundEnabled
    },
    setSound: (state, action: { payload: boolean }) => {
      state.soundEnabled = action.payload
    },
    toggleNotifications: (state) => {
      state.notificationsEnabled = !state.notificationsEnabled
    },
    setNotifications: (state, action: { payload: boolean }) => {
      state.notificationsEnabled = action.payload
    },
    setReferralModalOpen: (state, action: { payload: boolean }) => {
      state.referralModalOpen = action.payload
    },
    setSupportModalOpen: (state, action: { payload: boolean }) => {
      state.supportModalOpen = action.payload
    },
    setChatStatus: (
      state,
      action: { payload: { unreadMessages: number; friendRequests: number; onlineCount: number } }
    ) => {
      state.chatStatus = action.payload
    },
  },
})

export const {
  openModal,
  closeModal,
  setAuthMode,
  toggleAuthMode,
  navigate,
  setGameIndex,
  setLeaderboardTier,
  openChat,
  openChatWithPeerUserId,
  clearActiveChatId,
  clearPendingChatPeer,
  openInstructions,
  closeInstructions,
  setActiveModeName,
  toggleSound,
  setSound,
  toggleNotifications,
  setNotifications,
  setReferralModalOpen,
  setSupportModalOpen,
  setChatStatus,
} = uiSlice.actions
export const uiReducer = uiSlice.reducer
