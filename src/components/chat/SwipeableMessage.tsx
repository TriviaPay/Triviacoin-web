import { useRef, useCallback } from 'react'

type Props = {
  children: React.ReactNode
  onSwipeReply: () => void
  className?: string
}

const SWIPE_THRESHOLD = 60

/**
 * Wraps a message with swipe-to-reply on touch devices (tablet, mobile).
 * Swipe left to trigger reply.
 */
const SwipeableMessage = ({ children, onSwipeReply, className = '' }: Props) => {
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    }
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current) return
      const touch = e.changedTouches[0]
      const deltaX = touchStart.current.x - touch.clientX
      const deltaY = Math.abs(touchStart.current.y - touch.clientY)
      touchStart.current = null
      // Swipe left (positive deltaX) and not too vertical
      if (deltaX >= SWIPE_THRESHOLD && deltaY < 100) {
        onSwipeReply()
      }
    },
    [onSwipeReply]
  )

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  )
}

export default SwipeableMessage
