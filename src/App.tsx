import { useCallback, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppDispatch, useAppSelector } from './store/store'
import { fetchNextDraw } from './store/timerSlice'
import { fetchLeaderboard } from './lib/utils'
import { navigate, setReferralModalOpen } from './store/uiSlice'
import Home from './app/Home'
import HomeFreeQuizEmbed from './components/home/HomeFreeQuizEmbed'
import HomeActionIcons from './components/home/HomeActionIcons'
import Result from './app/Result'
import ChallengeFriendsCard from './components/layout/ChallengeFriendsCard'
import Navbar from './components/layout/Navbar'
import FloatingIcons from './components/animations/FloatingIcons'
import SupportCard from './components/layout/SupportCard'
import AuthModal from './components/modals/AuthModal'
import InstructionModal from './components/modals/InstructionModal'
import ReferralModal from './components/modals/ReferralModal'
import SupportModal from './components/modals/SupportModal'
import DailyChallenges from './app/DailyChallenges'
import LeaderboardPage from './app/LeaderboardPage'
import ChatsPage from './app/ChatsPage'
import WalletPage from './app/WalletPage'
import ShopPage from './app/ShopPage'
import ProfilePage from './app/ProfilePage'
import SettingsPage from './app/SettingsPage'
import CheckoutPage from './app/CheckoutPage'
import BackgroundAudio from './components/audio/BackgroundAudio'
import AdSenseBottomBar from './components/ads/AdSenseBottomBar'

const App = () => {
  const dispatch = useAppDispatch()
  const currentPage = useAppSelector((state) => state.ui.currentPage)
  const token = useAppSelector((s) => s.auth.token)
  const prevTokenRef = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    void dispatch(fetchNextDraw())
  }, [dispatch])

  useEffect(() => {
    if (prevTokenRef.current === undefined) {
      prevTokenRef.current = token ?? null
      return
    }
    const prev = prevTokenRef.current
    const cur = token ?? null
    const appeared = Boolean(cur && !prev)
    const cleared = Boolean(!cur && prev)
    prevTokenRef.current = cur
    if (appeared || cleared) {
      void dispatch(fetchNextDraw({ force: true }))
    }
  }, [dispatch, token])

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard'],
    queryFn: fetchLeaderboard,
  })

  const handlePlayAgain = useCallback(() => {
    dispatch(navigate('daily'))
  }, [dispatch])

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <FloatingIcons />
      <BackgroundAudio />
      <Navbar />
      <AuthModal />
      <InstructionModal />
      <ReferralModal
        visible={useAppSelector((s) => s.ui.referralModalOpen)}
        onClose={() => dispatch(setReferralModalOpen(false))}
      />
      <SupportModal />

      <main className="relative z-10 w-full min-w-0 px-3 pb-28 pt-20 sm:px-6 sm:pb-32 sm:pt-24 lg:px-8">
        <div className="mx-auto w-full min-w-0 max-w-screen-2xl space-y-4 sm:space-y-6">
          {currentPage === 'home' && (
            <>
              <div className="grid w-full items-start gap-6 lg:grid-cols-[3fr_1fr] lg:items-start">
                <Home />
                <div className="w-full min-w-0 self-start lg:sticky lg:top-28">
                  <HomeActionIcons />
                  <HomeFreeQuizEmbed />
                </div>
              </div>

              <div className="grid w-full gap-6 lg:grid-cols-3">
                <Result leaderboardQuery={leaderboardQuery} />
                <ChallengeFriendsCard
                  onPlayAgain={handlePlayAgain}
                  onShare={() => navigator.share?.({ title: 'Trivia Quest', text: 'I crushed this quiz!' })}
                />
                <SupportCard />
              </div>
            </>
          )}

          {currentPage === 'daily' && <DailyChallenges />}
          {currentPage === 'leaderboard' && <LeaderboardPage />}
          {currentPage === 'chats' && <ChatsPage />}
          {currentPage === 'wallet' && <WalletPage />}
          {currentPage === 'shop' && <ShopPage />}
          {currentPage === 'checkout' && <CheckoutPage />}
          {currentPage === 'profile' && <ProfilePage />}
          {currentPage === 'settings' && <SettingsPage />}
        </div>
      </main>
      <AdSenseBottomBar />
    </div>
  )
}

export default App
