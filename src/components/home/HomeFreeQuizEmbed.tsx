import { useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/store'
import { fetchModesStatus } from '../../store/triviaSlice'
import TriviaChallengePanel from '../trivia/TriviaChallengePanel'
import { buildTierMeta } from '../../utils/triviaTierMeta'

const SUBSCRIBE_BLURB =
  'Subscribe for more prize money and daily rewards: Bronze and Silver show Subscribe until you have access, then Play.'

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
    <div className="w-full max-w-xl lg:max-w-none" data-tour="tour-sidebar-quiz">
      <TriviaChallengePanel
        mode="free"
        onBack={() => {}}
        embedOnHome
        tierMeta={tierMeta}
        overlayPosition="viewport"
      />
      <p className="mt-4 text-center text-xs leading-relaxed text-white/55 sm:text-sm">{SUBSCRIBE_BLURB}</p>
    </div>
  )
}
