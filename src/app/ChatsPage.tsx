import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '../store/store'
import { clearActiveChatId, clearPendingChatPeer, setChatStatus } from '../store/uiSlice'
import { apiService } from '../services/apiService'
import ChatAvatar from '../components/chat/ChatAvatar'
import SwipeableMessage from '../components/chat/SwipeableMessage'
import boyImg from '../assets/boy.jpg'
import girlImg from '../assets/girl.jpg'

type ChatTab = 'GLOBAL' | 'PRIVATE'

interface GlobalMessage {
  id: number
  user_id: number
  username: string
  message: string
  created_at: string
  profile_pic?: string
  avatar_url?: string
  reply_to?: { id: number; message: string; sender: string }
}

interface PrivateConversation {
  conversation_id: number
  peer_user_id: number
  peer_username: string
  peer_profile_pic?: string
  peer_avatar_url?: string
  last_message_at?: string
  last_message?: string
  unread_count?: number
  peer_online?: boolean
}

interface PrivateMessage {
  id: number
  sender_id: number
  sender_username?: string
  sender_profile_pic?: string | null
  sender_avatar_url?: string | null
  message: string
  created_at: string
  reply_to?: { id: number; message: string; sender: string }
}

const fallbackAvatars = [boyImg, girlImg, boyImg, girlImg]

function parseChatDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN)
  const s = String(dateStr).trim()
  const toParse = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}/.test(s) && !/[Z+-]\d{2}:?\d{2}$|[Z]$/i.test(s)
    ? s + 'Z'
    : s
  return new Date(toParse)
}

function formatTime(dateStr: string): string {
  const d = parseChatDate(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatListTime(dateStr: string): string {
  const d = parseChatDate(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type ConvRecord = PrivateConversation & Record<string, unknown>

function convFlags(c: PrivateConversation): ConvRecord {
  return c as ConvRecord
}

/** Incoming chat request: recipient must accept before replying (mobile parity). */
function conversationNeedsMyAcceptance(c: PrivateConversation, currentUserId: string | number | null): boolean {
  const r = convFlags(c)
  if (r.needs_acceptance === true || r.pending_acceptance === true || r.awaiting_my_acceptance === true) return true
  if (r.chat_request_for_me === true) return true
  const st = String(r.status ?? r.chat_status ?? '').toLowerCase()
  if ((st === 'pending' || st === 'pending_acceptance') && currentUserId != null) {
    const init = r.initiated_by_user_id ?? r.initiated_by ?? r.started_by_user_id
    if (init !== undefined && init !== null && String(init) !== String(currentUserId)) return true
  }
  return false
}

/** Outgoing: you sent the first message / request; waiting on the other user. */
function conversationWaitingPeerAcceptance(c: PrivateConversation, currentUserId: string | number | null): boolean {
  const r = convFlags(c)
  if (r.waiting_for_acceptance === true || r.pending_peer_acceptance === true) return true
  const st = String(r.status ?? r.chat_status ?? '').toLowerCase()
  if ((st === 'pending' || st === 'pending_acceptance') && currentUserId != null) {
    const init = r.initiated_by_user_id ?? r.initiated_by ?? r.started_by_user_id
    if (init !== undefined && init !== null && String(init) === String(currentUserId)) return true
  }
  return false
}

function iBlockedPeerInConversation(c: PrivateConversation): boolean {
  const r = convFlags(c)
  return (
    r.blocked_by_me === true ||
    r.i_blocked_peer === true ||
    r.i_blocked === true ||
    String(r.block_direction ?? '').toLowerCase() === 'outbound'
  )
}

const ChatsPage = () => {
  const dispatch = useAppDispatch()
  const token = useAppSelector((s) => s.auth.token)
  const activeChatId = useAppSelector((s) => s.ui.activeChatId)
  const pendingChatPeerUserId = useAppSelector((s) => s.ui.pendingChatPeerUserId)
  const pendingChatNonce = useAppSelector((s) => s.ui.pendingChatNonce)
  const user = useAppSelector((s) => s.auth.user)
  const profile = useAppSelector((s) => s.auth.user) as { account_id?: number; username?: string } | undefined

  const [activeTab, setActiveTab] = useState<ChatTab>('GLOBAL')
  const [globalMessages, setGlobalMessages] = useState<GlobalMessage[]>([])
  const [conversations, setConversations] = useState<PrivateConversation[]>([])
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null)
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([])

  const [globalLoading, setGlobalLoading] = useState(false)
  const [convLoading] = useState(false)
  const [msgLoading] = useState(false)
  const [globalSending, setGlobalSending] = useState(false)
  const [privateSending, setPrivateSending] = useState(false)
  const [acceptRejectLoading, setAcceptRejectLoading] = useState(false)

  const [draft, setDraft] = useState('')
  const [replyingTo, setReplyingTo] = useState<{ id: number; message: string; sender: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showScrollDown, setShowScrollDown] = useState(false)
  /** Open thread with composer only (no existing conversation) — user sends real first message. */
  const [pendingComposePeerId, setPendingComposePeerId] = useState<number | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const convFetchedRef = useRef(false)
  const messagesFetchedRef = useRef<number | null>(null)
  /** Tracks which thread was last opened so we scroll to end once per visit. */
  const scrollAnchorRef = useRef<string | null>(null)
  /** When true, new messages keep the view pinned to the latest (user is at bottom or just opened). */
  const followBottomRef = useRef(true)

  const ACCOUNT_ID_KEY = 'trivia_chat_account_id'
  const [accountId, setAccountId] = useState<number | string | null>(() => {
    try {
      const stored = sessionStorage?.getItem(ACCOUNT_ID_KEY)
      if (stored) return stored
    } catch {}
    return (user as any)?.account_id ?? (user as any)?.id ?? null
  })
  const currentUserId = accountId ?? (user as any)?.account_id ?? (user as any)?.id ?? profile?.account_id

  const chatStatus = useAppSelector((s) => s.ui.chatStatus)

  const getScrollAnchor = useCallback((): string | null => {
    if (activeTab === 'GLOBAL') return 'global'
    if (activeTab === 'PRIVATE' && selectedConvId != null) return `private-${selectedConvId}`
    if (activeTab === 'PRIVATE' && pendingComposePeerId != null) return `compose-${pendingComposePeerId}`
    return null
  }, [activeTab, selectedConvId, pendingComposePeerId])

  const applyChatMetadata = useCallback(
    (meta: {
      online: number
      unread: number
      unreadGlobal: number
      unreadPrivate: number
      requests: number
    } | undefined) => {
      if (!meta) return
      dispatch(
        setChatStatus({
          unreadMessages: Number.isFinite(meta.unread) ? meta.unread : 0,
          unreadGlobal: Number.isFinite(meta.unreadGlobal) ? meta.unreadGlobal : 0,
          unreadPrivate: Number.isFinite(meta.unreadPrivate) ? meta.unreadPrivate : 0,
          friendRequests: Number.isFinite(meta.requests) ? meta.requests : 0,
          onlineCount: Number.isFinite(meta.online) ? meta.online : 0,
        }),
      )
    },
    [dispatch],
  )

  const refreshNavbarChatBadge = useCallback(async () => {
    if (!token) return
    const res = await apiService.getGlobalChatMessages(token, 1)
    applyChatMetadata(res.metadata)
  }, [token, applyChatMetadata])

  const fetchGlobalMessages = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setGlobalLoading(true)
    try {
      const res = await apiService.getGlobalChatMessages(token)
      if (res.success && res.metadata) applyChatMetadata(res.metadata)
      if (res.success && res.data) {
        const seen = new Set<number>()
        setGlobalMessages(res.data.filter((m: { id: number }) => {
          if (seen.has(m.id)) return false
          seen.add(m.id)
          return true
        }))
      }
    } finally {
      if (!opts?.quiet) setGlobalLoading(false)
    }
  }, [token, applyChatMetadata])

  useEffect(() => {
    if (!token) return
    void refreshNavbarChatBadge()
  }, [token, refreshNavbarChatBadge])

  useEffect(() => {
    if (!token) {
      try {
        sessionStorage?.removeItem(ACCOUNT_ID_KEY)
      } catch {}
      return
    }
    apiService.fetchProfileSummary(token).then((res) => {
      if (res.success && res.data) {
        const d = res.data
        const id = d.account_id ?? d.id ?? d.user_id ?? d.user?.account_id ?? d.user?.id
        if (id != null) {
          const sid = String(id)
          setAccountId(sid)
          try {
            sessionStorage?.setItem(ACCOUNT_ID_KEY, sid)
          } catch {}
        }
      }
    })
  }, [token])

  const fetchConversations = useCallback(async () => {
    if (!token) return
    const res = await apiService.getPrivateConversations(token)
    if (res.success && res.data) setConversations(res.data)
  }, [token])

  const fetchPrivateMessages = useCallback(
    async (convId: number) => {
      if (!token) return
      const res = await apiService.getPrivateMessages(token, convId)
      if (res.success && res.data) setPrivateMessages(res.data)
    },
    [token]
  )

  useEffect(() => {
    if (activeTab === 'GLOBAL') {
      void fetchGlobalMessages()
    }
    if (activeTab === 'PRIVATE' && token && !convFetchedRef.current) {
      convFetchedRef.current = true
      fetchConversations()
    }
  }, [activeTab, token, fetchGlobalMessages, fetchConversations])

  useEffect(() => {
    if (!activeChatId) return
    const id = Number(activeChatId)
    if (!Number.isFinite(id) || id <= 0) {
      dispatch(clearActiveChatId())
      return
    }
    setActiveTab('PRIVATE')
    setSelectedConvId(id)
    dispatch(clearActiveChatId())
  }, [activeChatId, dispatch])

  useEffect(() => {
    if (!token || pendingChatPeerUserId == null) return
    const peerId = Number(pendingChatPeerUserId)
    if (!Number.isFinite(peerId) || peerId <= 0) {
      dispatch(clearPendingChatPeer())
      return
    }
    setPendingComposePeerId(null)
    let cancelled = false
    setActiveTab('PRIVATE')
    void (async () => {
      let list: PrivateConversation[] = []
      const res = await apiService.getPrivateConversations(token)
      if (cancelled) return
      if (res.success && res.data) {
        list = res.data as PrivateConversation[]
        setConversations(list)
      }
      const match = list.find((c) => Number(c.peer_user_id) === peerId)
      if (match) {
        setSelectedConvId(match.conversation_id)
        dispatch(clearPendingChatPeer())
        return
      }
      dispatch(clearPendingChatPeer())
      if (!cancelled) setPendingComposePeerId(peerId)
    })()
    return () => {
      cancelled = true
    }
  }, [pendingChatPeerUserId, pendingChatNonce, token, dispatch])

  useEffect(() => {
    if (activeTab === 'GLOBAL') convFetchedRef.current = false
  }, [activeTab])

  useEffect(() => {
    if (!selectedConvId || !token) {
      setPrivateMessages([])
      messagesFetchedRef.current = null
      return
    }
    messagesFetchedRef.current = selectedConvId
    let cancelled = false
    void (async () => {
      await fetchPrivateMessages(selectedConvId)
      if (!cancelled) await refreshNavbarChatBadge()
    })()
    return () => {
      cancelled = true
    }
  }, [selectedConvId, token, fetchPrivateMessages, refreshNavbarChatBadge])

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'GLOBAL') void fetchGlobalMessages({ quiet: true })
      else if (!token) {
        /* guests: no private poll */
      } else if (selectedConvId) {
        void fetchPrivateMessages(selectedConvId).then(() => refreshNavbarChatBadge())
      } else {
        void fetchConversations().then(() => refreshNavbarChatBadge())
      }
    }, 15000)
    return () => clearInterval(interval)
  }, [
    token,
    activeTab,
    selectedConvId,
    fetchGlobalMessages,
    fetchConversations,
    fetchPrivateMessages,
    refreshNavbarChatBadge,
  ])

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    const distFromBottom = scrollHeight - scrollTop - clientHeight
    followBottomRef.current = distFromBottom <= 120
    setShowScrollDown(distFromBottom > 120)
  }, [])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll, activeTab])

  const scrollMessagesToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = scrollContainerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  /** Scroll to latest once when opening global or a private thread. */
  useEffect(() => {
    const anchor = getScrollAnchor()
    if (!anchor || scrollAnchorRef.current === anchor) return
    scrollAnchorRef.current = anchor
    followBottomRef.current = true
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollMessagesToBottom('auto'))
    })
  }, [getScrollAnchor, scrollMessagesToBottom])

  /** Pin to bottom only while user is already at the bottom (e.g. poll or send). */
  useEffect(() => {
    const anchor = getScrollAnchor()
    if (!anchor || anchor !== scrollAnchorRef.current || !followBottomRef.current) return
    if (activeTab === 'GLOBAL' && globalLoading) return
    requestAnimationFrame(() => scrollMessagesToBottom('auto'))
  }, [
    globalMessages.length,
    privateMessages.length,
    globalLoading,
    activeTab,
    getScrollAnchor,
    scrollMessagesToBottom,
  ])

  const scrollToBottom = useCallback(() => {
    followBottomRef.current = true
    scrollMessagesToBottom('smooth')
    setShowScrollDown(false)
  }, [scrollMessagesToBottom])

  const filteredConversations = conversations.filter(
    (c) =>
      !searchQuery.trim() ||
      (c.peer_username || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedConv = conversations.find((c) => c.conversation_id === selectedConvId)

  const needsAcceptance =
    Boolean(selectedConv && conversationNeedsMyAcceptance(selectedConv, currentUserId ?? null))
  const waitingPeerAccept =
    Boolean(selectedConv && conversationWaitingPeerAcceptance(selectedConv, currentUserId ?? null))
  const peerBlockedByMe = Boolean(selectedConv && iBlockedPeerInConversation(selectedConv))
  const privateComposeLocked =
    Boolean(selectedConv) && (needsAcceptance || waitingPeerAccept || peerBlockedByMe)

  const handleAcceptChatRequest = async () => {
    if (!token || selectedConvId == null) return
    setAcceptRejectLoading(true)
    const res = await apiService.acceptRejectPrivateChat(token, {
      conversation_id: selectedConvId,
      action: 'accept',
    })
    setAcceptRejectLoading(false)
    if (res.success) {
      await fetchConversations()
      await fetchPrivateMessages(selectedConvId)
      void refreshNavbarChatBadge()
    }
  }

  const handleRejectChatRequest = async () => {
    if (!token || selectedConvId == null) return
    setAcceptRejectLoading(true)
    const res = await apiService.acceptRejectPrivateChat(token, {
      conversation_id: selectedConvId,
      action: 'reject',
    })
    setAcceptRejectLoading(false)
    if (res.success) {
      setSelectedConvId(null)
      await fetchConversations()
      void refreshNavbarChatBadge()
    }
  }

  const handleSendGlobal = async () => {
    if (!draft.trim() || !token || globalSending) return
    const msg = draft.trim()
    const replyId = replyingTo?.id
    setDraft('')
    setReplyingTo(null)
    setGlobalSending(true)
    const res = await apiService.sendGlobalMessage(token, msg, replyId)
    setGlobalSending(false)
    if (res.success) {
      const r = await apiService.getGlobalChatMessages(token)
      if (r.success && r.metadata) applyChatMetadata(r.metadata)
      if (r.success && r.data) {
        const seen = new Set<number>()
        setGlobalMessages(r.data.filter((m) => {
          if (seen.has(m.id)) return false
          seen.add(m.id)
          return true
        }))
      } else {
        fetchGlobalMessages()
      }
    } else {
      setDraft(msg)
    }
    setTimeout(() => {
      followBottomRef.current = true
      scrollMessagesToBottom('smooth')
    }, 50)
  }

  const handleSendPrivate = async () => {
    if (!draft.trim() || !token || privateSending) return

    if (pendingComposePeerId != null) {
      const peerId = pendingComposePeerId
      const msg = draft.trim()
      const replyId = replyingTo?.id
      setDraft('')
      setReplyingTo(null)
      setPrivateSending(true)
      const res = await apiService.sendPrivateMessage(token, {
        message: msg,
        recipient_id: peerId,
        reply_to_message_id: replyId,
      })
      setPrivateSending(false)
      if (res.success) {
        setPendingComposePeerId(null)
        const d = (res.data ?? {}) as Record<string, unknown>
        const newConv =
          (typeof d.conversation_id === 'number' ? d.conversation_id : undefined) ??
          (typeof d.conversationId === 'number' ? d.conversationId : undefined)
        const listRes = await apiService.getPrivateConversations(token)
        if (listRes.success && listRes.data) {
          const list = listRes.data as PrivateConversation[]
          setConversations(list)
          const cid =
            typeof newConv === 'number' && newConv > 0
              ? newConv
              : list.find((c) => Number(c.peer_user_id) === Number(peerId))?.conversation_id ?? null
          if (cid != null) setSelectedConvId(cid)
          if (cid != null) void fetchPrivateMessages(cid)
        }
        void refreshNavbarChatBadge()
      } else {
        setDraft(msg)
      }
      setTimeout(() => {
        followBottomRef.current = true
        scrollMessagesToBottom('smooth')
      }, 50)
      return
    }

    if (!selectedConv || privateComposeLocked) return
    const msg = draft.trim()
    const replyId = replyingTo?.id
    const peerUserId = selectedConv.peer_user_id
    setDraft('')
    setReplyingTo(null)
    setPrivateSending(true)
    const payload = {
      message: msg,
      recipient_id: peerUserId,
      conversation_id: selectedConvId ?? undefined,
      reply_to_message_id: replyId ?? undefined,
    }
    const res = await apiService.sendPrivateMessage(token, payload)
    setPrivateSending(false)
    if (res.success) {
      const r = await apiService.getPrivateMessages(token, selectedConvId!)
      if (r.success && r.data) {
        const seen = new Set<number>()
        setPrivateMessages(r.data.filter((m) => {
          if (seen.has(m.id)) return false
          seen.add(m.id)
          return true
        }))
      } else {
        fetchPrivateMessages(selectedConvId!)
      }
      void refreshNavbarChatBadge()
    } else {
      setDraft(msg)
    }
    setTimeout(() => {
      followBottomRef.current = true
      scrollMessagesToBottom('smooth')
    }, 50)
  }

  const handleReplyToMessage = (id: number, text: string, sender: string) => {
    setReplyingTo({ id, message: text, sender })
  }

  const isOwn = (msg: { user_id?: number; sender_id?: number }) => {
    const uid = msg.user_id ?? msg.sender_id
    if (uid != null && currentUserId != null)
      return String(uid) === String(currentUserId)
    return false
  }

  const renderMessage = (
    msg: GlobalMessage | PrivateMessage,
    key: string
  ) => {
    const own = isOwn(msg)
    const m = msg as any
    const fallbackImg =
      typeof fallbackAvatars[0] === 'string'
        ? fallbackAvatars[0]
        : (fallbackAvatars[0] as any)?.src ?? boyImg
    const sender = own ? 'You' : (m.username ?? m.sender_username ?? 'Unknown')

    const onReply = () => handleReplyToMessage(msg.id, msg.message, sender)

    return (
      <div key={key} className={`flex ${own ? 'justify-end' : 'justify-start'} mb-3`}>
        <SwipeableMessage onSwipeReply={onReply} className={`flex max-w-[80%] sm:max-w-[65%] flex-col ${own ? 'items-end' : 'items-start'}`}>
          <div
            role="button"
            tabIndex={0}
            onClick={onReply}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onReply()
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              onReply()
            }}
            aria-label={`Reply to message from ${sender}`}
            className="cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-[#ffd66b] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-2xl -m-1 p-1 touch-manipulation"
          >
          <div className={`mb-1 flex items-center gap-1.5 ${own ? 'flex-row-reverse' : ''}`}>
            <ChatAvatar
              senderAvatarUrl={m.sender_avatar_url ?? m.senderAvatarUrl}
              senderProfilePic={m.sender_profile_pic ?? m.senderProfilePic}
              profilePic={m.profile_pic ?? m.profilePic}
              avatarUrl={m.avatar_url ?? m.avatarUrl}
              alt={sender}
              size={24}
              fallbackSrc={fallbackImg}
              className="h-6 w-6 shrink-0"
            />
            <span className="text-xs font-semibold text-white/80">{sender}</span>
          </div>
          <div
            className={`rounded-2xl px-3 py-2 ${
              own
                ? 'bg-gradient-to-b from-[#ffd66b] to-[#f3a011] text-[#7c4c00]'
                : 'bg-white/15 text-white'
            }`}
          >
            {msg.reply_to && (
              <div className="mb-1 border-l-2 border-white/40 pl-2 text-fluid-xs opacity-90">
                <div className="font-semibold">{(msg.reply_to as any).sender ?? (msg.reply_to as any).sender_username}</div>
                <div className="truncate">{msg.reply_to.message}</div>
              </div>
            )}
            <span className="type-body-sm">{msg.message}</span>
          </div>
          <span className="mt-0.5 text-fluid-2xs text-white/60">
            {formatTime(msg.created_at)}
          </span>
          </div>
        </SwipeableMessage>
      </div>
    )
  }

  const privateDetailOpen =
    activeTab === 'PRIVATE' && (selectedConvId != null || pendingComposePeerId != null)

  return (
    <section
      className="section-card relative mx-auto flex h-[calc(100dvh-10.5rem)] max-h-[calc(100dvh-10.5rem)] min-h-[320px] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-quiz-panel px-3 py-4 text-white sm:max-w-2xl md:max-w-3xl sm:px-5 sm:py-5"
      data-tour="tour-chats"
    >
      {/* Toggles - centered */}
      <div className="mb-4 flex shrink-0 justify-center gap-2">
        <button
          onClick={() => setActiveTab('GLOBAL')}
          className={`relative rounded-full px-4 py-2.5 text-fluid-sm font-semibold transition sm:px-6 ${
            activeTab === 'GLOBAL'
              ? 'bg-gradient-to-b from-[#ffd66b] to-[#f3a011] text-[#7c4c00] shadow-glow'
              : 'bg-white/15 text-white/70 hover:bg-white/20'
          }`}
        >
          Global
          {chatStatus.unreadGlobal > 0 && activeTab !== 'GLOBAL' ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-fluid-2xs font-bold text-white">
              {chatStatus.unreadGlobal > 99 ? '99+' : chatStatus.unreadGlobal}
            </span>
          ) : null}
        </button>
        <button
          onClick={() => setActiveTab('PRIVATE')}
          className={`relative rounded-full px-4 py-2.5 text-fluid-sm font-semibold transition sm:px-6 ${
            activeTab === 'PRIVATE'
              ? 'bg-gradient-to-b from-[#ffd66b] to-[#f3a011] text-[#7c4c00] shadow-glow'
              : 'bg-white/15 text-white/70 hover:bg-white/20'
          }`}
        >
          Private
          {chatStatus.unreadPrivate > 0 && activeTab !== 'PRIVATE' ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-fluid-2xs font-bold text-white">
              {chatStatus.unreadPrivate > 99 ? '99+' : chatStatus.unreadPrivate}
            </span>
          ) : null}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 w-full flex-col gap-0 overflow-hidden rounded-xl border border-white/10 bg-black/10 text-white sm:flex-row sm:gap-4">
        {/* Left panel - only for PRIVATE; on mobile: full width when no conv selected, hidden when conv selected */}
        {activeTab === 'PRIVATE' && (
          <div
            className={`flex min-h-0 flex-col border-r-0 border-white/10 sm:w-[300px] sm:min-w-[280px] sm:max-w-[320px] sm:border-r ${
              privateDetailOpen ? 'hidden sm:flex' : 'flex w-full'
            }`}
          >
            {!token ? (
              <div className="flex flex-1 items-center justify-center p-4 text-center type-body-sm text-white/60">
                Sign in to view private chats
              </div>
            ) : (
              <>
                <div className="shrink-0 px-3 py-3">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field !rounded-xl !bg-white/10 !px-3 !py-2"
                  />
                </div>
                <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                  {convLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#ffd66b] border-t-transparent" />
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="py-8 text-center type-body-sm text-white/60">
                      No private chats yet
                    </div>
                  ) : (
                    <div className="space-y-1 p-2">
                      {filteredConversations.map((conv) => {
                        const isActive = conv.conversation_id === selectedConvId
                        const fallbackConv =
                          typeof boyImg === 'string' ? boyImg : (boyImg as any)?.src ?? ''
            return (
              <motion.button
                            key={conv.conversation_id}
                whileTap={{ scale: 0.98 }}
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition ${
                              isActive ? 'bg-white/15 shadow-glow' : 'bg-white/5 hover:bg-white/10'
                            }`}
                            onClick={() => {
                              setPendingComposePeerId(null)
                              setSelectedConvId(conv.conversation_id)
                            }}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <ChatAvatar
                                senderAvatarUrl={conv.peer_avatar_url ?? (conv as any).peerAvatarUrl}
                                senderProfilePic={conv.peer_profile_pic ?? (conv as any).peerProfilePic}
                                alt={conv.peer_username || 'User'}
                                size={40}
                                fallbackSrc={fallbackConv}
                                className="h-10 w-10 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold">
                                  {conv.peer_username || 'Unknown'}
                                </p>
                                <p className="truncate type-body-sm text-white/70">
                                  {conv.last_message || 'No messages yet'}
                                </p>
                  </div>
                </div>
                            {(conv.unread_count ?? 0) > 0 ? (
                              <span className="ml-2 flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-fluid-2xs font-bold text-white">
                                {(conv.unread_count ?? 0) > 99 ? '99+' : conv.unread_count}
                              </span>
                            ) : null}
                            <span className="ml-2 hidden shrink-0 text-fluid-xs text-white/60 xs:inline">
                              {conv.last_message_at
                                ? formatListTime(conv.last_message_at)
                                : ''}
                            </span>
              </motion.button>
            )
          })}
        </div>
                  )}
                </div>
              </>
            )}
      </div>
        )}

        {/* Messages area - hidden on mobile until a thread or waiting state is open */}
        <div
          className={`relative flex min-h-0 min-w-0 flex-1 flex-col ${
            activeTab === 'PRIVATE' && !privateDetailOpen ? 'hidden sm:flex' : 'flex'
          }`}
        >
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-3 sm:px-4">
            {activeTab === 'PRIVATE' && privateDetailOpen && (
              <button
                onClick={() => {
                  setSelectedConvId(null)
                  setPendingComposePeerId(null)
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:hidden"
                aria-label="Back to conversations"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h3 className="flex-1 truncate type-card-title text-safe">
              {activeTab === 'GLOBAL'
                ? `Global Chat${chatStatus.onlineCount > 0 ? ` · ${chatStatus.onlineCount} online` : ''}`
                : pendingComposePeerId != null && !selectedConvId
                  ? 'New message'
                  : selectedConv
                    ? selectedConv.peer_username || 'Chat'
                    : 'Select a chat'}
            </h3>
          </div>

          {activeTab === 'PRIVATE' && selectedConvId != null && needsAcceptance && selectedConv ? (
            <div className="shrink-0 border-b border-white/10 bg-white/5 px-3 py-3 text-center sm:px-4">
              <p className="type-body-sm font-semibold text-white">Chat request</p>
              <p className="mt-1 type-body-sm text-white/75">
                <span className="font-medium text-white/90">{selectedConv.peer_username || 'This user'}</span> wants to
                chat with you
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={acceptRejectLoading}
                  onClick={() => void handleRejectChatRequest()}
                  className="min-h-[44px] flex-1 rounded-xl border border-white/20 bg-white/10 py-2.5 text-fluid-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
                >
                  {acceptRejectLoading ? '…' : 'Reject'}
                </button>
                <button
                  type="button"
                  disabled={acceptRejectLoading}
                  onClick={() => void handleAcceptChatRequest()}
                  className="min-h-[44px] flex-1 rounded-xl bg-gradient-to-b from-[#ffd66b] to-[#f3a011] py-2.5 text-fluid-sm font-semibold text-[#7c4c00] shadow-glow disabled:opacity-60"
                >
                  {acceptRejectLoading ? '…' : 'Accept'}
                </button>
              </div>
            </div>
          ) : null}

          {activeTab === 'PRIVATE' && selectedConvId != null && peerBlockedByMe ? (
            <div
              className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-red-500/15 px-3 py-2.5 type-body-sm text-red-200 sm:px-4"
              role="status"
            >
              <span className="text-base leading-none opacity-90" aria-hidden>
                ⊘
              </span>
              <p className="min-w-0 flex-1 leading-snug">
                You have blocked this user. You cannot send or receive messages.
              </p>
            </div>
          ) : null}

          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto scrollbar-hide px-3 sm:px-4 py-3"
            style={{ minHeight: 0 }}
          >
            {activeTab === 'GLOBAL' && (
              <>
                {globalLoading && globalMessages.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ffd66b] border-t-transparent" />
                  </div>
                ) : globalMessages.length === 0 ? (
                  <div className="py-12 text-center text-white/70">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  <>
                    {globalMessages.map((m) => renderMessage(m, `g-${m.id}`))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </>
            )}

            {activeTab === 'PRIVATE' && (
              <>
                {pendingComposePeerId != null && !selectedConvId ? (
                  <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center sm:py-10">
                    <p className="max-w-sm type-body-sm leading-relaxed text-white/80">
                      No chat with this player yet. Type your first message below — the thread opens after you send,
                      same as starting any private chat on mobile.
                    </p>
                  </div>
                ) : !selectedConvId ? (
                  <div className="flex flex-1 items-center justify-center py-12 text-center text-white/70">
                    Select a conversation from the list
                  </div>
                ) : msgLoading && privateMessages.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ffd66b] border-t-transparent" />
                  </div>
                ) : privateMessages.length === 0 ? (
                  <div className="py-12 text-center text-white/70">
                    No messages yet. Say hello!
                  </div>
                ) : (
                  <>
                    {privateMessages.map((m) => renderMessage(m, `p-${m.id}`))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </>
            )}
          </div>

          {/* Scroll to bottom button */}
          {showScrollDown && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-3 sm:right-6 z-10 flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/20 shadow-lg transition hover:bg-white/30 touch-manipulation"
              aria-label="Scroll to bottom"
            >
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
              </svg>
            </button>
          )}

          {(activeTab === 'GLOBAL' && token) || (token && (selectedConvId != null || pendingComposePeerId != null)) ? (
            <div className="shrink-0 border-t border-white/10 p-3">
              {replyingTo && (
                <div className="mb-2 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-fluid-xs font-semibold text-[#ffd66b]">Replying to {replyingTo.sender}</div>
                    <div className="truncate text-fluid-xs text-white/70">{replyingTo.message}</div>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="p-2 -mr-1 text-white/70 hover:text-white touch-manipulation shrink-0"
                    aria-label="Cancel reply"
                  >
                    ✕
                  </button>
        </div>
              )}
              <div className="flex items-center gap-2">
          <input
                  className="input-field min-h-[44px] flex-1 min-w-0 !rounded-full !border-white/15 !bg-white/10 !px-3 !py-3 sm:!py-2.5"
                  placeholder={
                    activeTab === 'GLOBAL'
                      ? 'Type a message'
                      : peerBlockedByMe
                        ? 'This user is blocked'
                        : waitingPeerAccept
                          ? 'Waiting for response…'
                          : needsAcceptance
                            ? 'Accept request to reply'
                            : 'Type a message'
                  }
            value={draft}
                  disabled={activeTab === 'PRIVATE' && privateComposeLocked}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (activeTab === 'GLOBAL') handleSendGlobal()
                      else handleSendPrivate()
                    }
            }}
          />
          <button
                  disabled={
                    !draft.trim() ||
                    (activeTab === 'GLOBAL' ? globalSending : privateSending) ||
                    (activeTab === 'PRIVATE' && !selectedConv && pendingComposePeerId == null) ||
                    (activeTab === 'PRIVATE' && privateComposeLocked)
                  }
                  className="min-h-[44px] shrink-0 rounded-full bg-gradient-to-b from-[#ffd66b] to-[#f3a011] px-4 py-3 text-fluid-sm font-semibold text-[#7c4c00] disabled:opacity-50 touch-manipulation sm:py-2.5"
                  onClick={activeTab === 'GLOBAL' ? handleSendGlobal : handleSendPrivate}
                >
                  {(activeTab === 'GLOBAL' ? globalSending : privateSending) ? '…' : 'Send'}
          </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default ChatsPage
