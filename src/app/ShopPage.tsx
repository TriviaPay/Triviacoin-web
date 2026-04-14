import { useEffect, useState, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../store/store'
import { fetchUserGems, fetchOwnedAvatarIds } from '../store/shopSlice'
import { fetchCosmetics } from '../store/cosmeticsSlice'
import { fetchGemPackages } from '../store/gemPackagesSlice'
import { authService } from '../services/authService'
import ShopItemCard from '../components/shop/ShopItemCard'
import diamondImg from '../assets/diamond.png'
import type { ShopCatalogItem } from '../types/shopCatalog'

type ShopTab = 'gems' | 'avatars'

const ShopPage = () => {
  const dispatch = useAppDispatch()
  const [activeTab, setActiveTab] = useState<ShopTab>('gems')

  const gems = useAppSelector((s) => s.shop.userBalance.gems)
  const cosmetics = useAppSelector((s) => s.cosmetics)
  const gemPackages = useAppSelector((s) => s.gemPackages)
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)

  const loadSessionShopData = useCallback(() => {
    const t = authService.getSessionToken()
    if (!t) return
    void dispatch(fetchUserGems())
    void dispatch(fetchOwnedAvatarIds())
  }, [dispatch])

  useEffect(() => {
    loadSessionShopData()
  }, [loadSessionShopData])

  useEffect(() => {
    const t = authService.getSessionToken()
    if (!t) return
    if (activeTab === 'gems') {
      void dispatch(fetchGemPackages())
    } else {
      void dispatch(fetchCosmetics())
    }
  }, [activeTab, dispatch])

  const items: ShopCatalogItem[] = activeTab === 'gems' ? gemPackages.items : cosmetics.items
  const status = activeTab === 'gems' ? gemPackages.status : cosmetics.status
  const error = activeTab === 'gems' ? gemPackages.error : cosmetics.error

  const showLoading = status === 'loading' && items.length === 0
  const showError = status === 'failed' && items.length === 0

  return (
    <section className="section-card rounded-3xl bg-quiz-panel text-white">
      <div className="mx-auto w-full max-w-4xl space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display">Shop</h2>
            <p className="text-sm sm:text-base text-white/70">
              Gem packs and avatars — purchase on checkout with Stripe or PayPal. Trivia subscriptions are on Trivia Challenge.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start rounded-2xl border border-white/15 bg-white/10 px-4 py-2 sm:self-center">
            <img src={diamondImg} alt="" className="h-7 w-7 object-contain sm:h-8 sm:w-8" aria-hidden />
            <span className="font-display text-xl tabular-nums text-[#ffd66b] sm:text-2xl">
              {typeof gems === 'number' ? gems : 0}
            </span>
          </div>
        </div>

        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('gems')}
            className={`rounded-full px-6 py-2.5 text-sm font-semibold transition ${
              activeTab === 'gems'
                ? 'bg-gradient-to-b from-[#ffd66b] to-[#f3a011] text-[#7c4c00] shadow-glow'
                : 'bg-white/15 text-white/70 hover:bg-white/20'
            }`}
          >
            Gems
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('avatars')}
            className={`rounded-full px-6 py-2.5 text-sm font-semibold transition ${
              activeTab === 'avatars'
                ? 'bg-gradient-to-b from-[#ffd66b] to-[#f3a011] text-[#7c4c00] shadow-glow'
                : 'bg-white/15 text-white/70 hover:bg-white/20'
            }`}
          >
            Avatars
          </button>
        </div>

        {!isAuthenticated && (
          <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
            Sign in to load your gem balance and shop catalog from the server.
          </p>
        )}

        {showLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-white/80">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#ffd66b] border-t-transparent" />
            <p className="text-sm sm:text-base">Loading shop…</p>
          </div>
        )}

        {showError && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-6 text-center">
            <p className="font-semibold text-red-100">Could not load items</p>
            {error && <p className="mt-2 text-sm text-red-100/80">{error}</p>}
            <button
              type="button"
              onClick={() => {
                const t = authService.getSessionToken()
                if (!t) return
                if (activeTab === 'gems') void dispatch(fetchGemPackages())
                else void dispatch(fetchCosmetics())
              }}
              className="mt-4 rounded-full bg-white/20 px-5 py-2 text-sm font-semibold text-white hover:bg-white/30"
            >
              Retry
            </button>
          </div>
        )}

        {!showLoading && !showError && items.length === 0 && (
          <p className="py-12 text-center text-sm text-white/70 sm:text-base">
            {activeTab === 'gems' ? 'No gem packages available yet.' : 'No avatars available yet.'}
          </p>
        )}

        {items.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ShopItemCard key={`${item.type}-${item.id}`} item={item} tab={activeTab} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default ShopPage
