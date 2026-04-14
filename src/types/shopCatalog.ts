/** Normalized shop row for UI (avatars + gem packages). */
export type ShopCatalogItem = {
  /** Row id from API (may differ from Monetization product_id). */
  id: string
  /** Billable `product_id` from GET /store/gem-packages or /cosmetics/* — pass to payment APIs. */
  productId: string | null
  name: string
  description: string
  gems: number
  price: string | null
  url: string | null
  image_url: string | null
  type: 'avatar' | 'gem'
  badge: string | null
}
