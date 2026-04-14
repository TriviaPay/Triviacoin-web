import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/store'
import { navigate } from '../../store/uiSlice'
import { startCheckout } from '../../store/checkoutSlice'
import { purchaseAvatarWithGems } from '../../store/shopSlice'
import { authService } from '../../services/authService'
import type { ShopCatalogItem } from '../../types/shopCatalog'
import ChatAvatar from '../chat/ChatAvatar'
import diamondImg from '../../assets/diamond.png'
import Button from '../ui/Button'

type Props = {
  item: ShopCatalogItem
  tab: 'gems' | 'avatars'
}

/**
 * Preview uses the same {@link ChatAvatar} pipeline as chat (Lottie JSON fetch + lottie-react).
 */
const ShopItemCard = ({ item, tab }: Props) => {
  const dispatch = useAppDispatch()
  const gemsBalance = useAppSelector((s) => s.shop.userBalance.gems)
  const ownedIds = useAppSelector((s) => s.shop.ownedAvatarIds)
  const purchaseLoading = useAppSelector((s) => s.shop.purchaseLoading)
  const tokenFromStore = useAppSelector((s) => s.auth.token)
  const hasAuth = Boolean(tokenFromStore || authService.getSessionToken())

  const url = item.url || item.image_url
  const billableId = item.productId?.trim() || null

  const isOwned = item.type === 'avatar' && ownedIds.includes(item.id)
  const canAfford = gemsBalance >= item.gems
  /** Server resolves price from `product_id`; client only needs a billable catalog id. */
  const canCheckout = Boolean(billableId)
  const checkoutLabel = item.description?.trim() || item.name

  const handleAvatarBuy = useCallback(() => {
    if (!hasAuth) {
      window.alert('Please sign in to purchase avatars.')
      return
    }
    if (isOwned) return
    if (!canAfford) {
      window.alert('Not enough gems.')
      return
    }
    void dispatch(purchaseAvatarWithGems(item.id))
      .unwrap()
      .then(() => window.alert('Purchase successful!'))
      .catch((err: string) => window.alert(err || 'Purchase failed'))
  }, [hasAuth, isOwned, canAfford, dispatch, item.id])

  const startCardCheckout = useCallback(() => {
    if (!hasAuth) {
      window.alert('Please sign in to purchase.')
      return
    }
    if (!billableId) {
      window.alert('Card checkout is not available for this item right now.')
      return
    }
    dispatch(
      startCheckout({
        productId: billableId,
        quantity: 1,
        label: checkoutLabel,
        paymentRoute: 'one_time',
        cancelReturnPage: 'shop',
        iconUrl: url,
        price: (item.price && item.price.trim() !== '') ? parseFloat(item.price) : undefined,
      }),
    )
    dispatch(navigate('checkout'))
  }, [billableId, checkoutLabel, dispatch, hasAuth])

  const handleGemBuy = useCallback(() => {
    startCardCheckout()
  }, [startCardCheckout])

  return (
    <div className="flex flex-col rounded-2xl border border-white/20 bg-white/10 p-4 transition hover:bg-white/15">
      <div className="mb-3 flex min-h-[120px] items-center justify-center">
        {url ? (
          <ChatAvatar avatarUrl={url} alt={item.name} size={100} variant="rounded" />
        ) : (
          <div className="text-4xl opacity-60">🎁</div>
        )}
      </div>
      <h3 className="font-semibold leading-snug text-white">{item.name}</h3>
      {item.description ? (
        <p className="mt-1 line-clamp-2 text-sm text-white/70">{item.description}</p>
      ) : null}
      <div className="mt-auto flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {item.gems > 0 && (
            <span className="inline-flex items-center gap-1.5 font-display text-lg text-[#ffd66b]">
              <img src={diamondImg} alt="" className="h-6 w-6 object-contain" aria-hidden />
              {item.gems}
            </span>
          )}
          {item.price != null && String(item.price).trim() !== '' && (
            <span className="font-display text-lg text-[#ffd66b]">${String(item.price).trim()}</span>
          )}
        </div>
        {tab === 'avatars' && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[8rem]">
            <Button
              className="px-4 py-2 text-sm"
              disabled={purchaseLoading || isOwned || !hasAuth}
              onClick={handleAvatarBuy}
            >
              {isOwned ? 'Owned' : !hasAuth ? 'Sign in' : !canAfford ? 'Need gems' : 'Buy with gems'}
            </Button>
            {canCheckout ? (
              <Button variant="secondary" className="px-4 py-2 text-sm" disabled={!hasAuth} onClick={startCardCheckout}>
                {!hasAuth ? 'Sign in' : 'Purchase'}
              </Button>
            ) : null}
          </div>
        )}
        {tab === 'gems' && (
          <Button className="px-4 py-2 text-sm" disabled={!hasAuth || !billableId} onClick={handleGemBuy}>
            {!hasAuth ? 'Sign in' : !billableId ? 'Unavailable' : 'Purchase'}
          </Button>
        )}
      </div>
    </div>
  )
}

export default ShopItemCard
