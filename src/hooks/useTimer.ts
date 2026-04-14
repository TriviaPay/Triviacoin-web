import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../store/store'
import { tick } from '../store/quizSlice'

type UseTimerProps = {
  isActive: boolean
  onExpire: () => void
}

export const useTimer = ({ isActive, onExpire }: UseTimerProps) => {
  const dispatch = useAppDispatch()
  const timer = useAppSelector((state) => state.quiz.timer)
  const quizStatus = useAppSelector((state) => state.quiz.quizStatus)

  useEffect(() => {
    if (!isActive || quizStatus !== 'inProgress') return undefined
    const id = window.setInterval(() => dispatch(tick()), 1000)
    return () => window.clearInterval(id)
  }, [dispatch, isActive, quizStatus])

  useEffect(() => {
    if (timer === 0 && isActive) {
      onExpire()
    }
  }, [timer, isActive, onExpire])

  return timer
}
