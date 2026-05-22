import { useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/store'
import { fetchModesStatus } from '../../store/triviaSlice'
import TriviaChallengePanel from '../trivia/TriviaChallengePanel'
import { buildTierMeta } from '../../utils/triviaTierMeta'

/**
 * Home hero: same `TriviaChallengePanel` free-mode UI as the daily quiz (API-driven, no duplicate layout).
 */
export default function HomeFreeQuizEmbed() {
  const dispatch = useAppDispatch()
  const auth = useAppSelector((s) => s.auth.isAuthenticated)
  const modesStatus = useAppSelector((s) => s.trivia.modesStatus)

  useEffect(() => {
    if (!auth) return
    void dispatch(fetchModesStatus())
  }, [auth, dispatch])

  const tierMeta = useMemo(() => buildTierMeta(0, modesStatus), [modesStatus])

  return (
    <div className="flex w-full max-w-xl flex-col lg:max-w-none" data-tour="tour-sidebar-quiz">
      <TriviaChallengePanel
        mode="free"
        onBack={() => {}}
        embedOnHome
        tierMeta={tierMeta}
        overlayPosition="viewport"
      />
    </div>
  )
}
