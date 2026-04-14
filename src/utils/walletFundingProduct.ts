import type { ShopCatalogItem } from '../types/shopCatalog'

/** Lowest USD gem pack with a billable `product_id` — used for wallet add-funds (catalog loaded in background). */
export function selectWalletFundingProductId(packages: ShopCatalogItem[]): string | null {
  const gems = packages.filter((p) => p.type === 'gem' && p.productId?.trim())
  if (gems.length === 0) return null
  const scored = gems.map((p) => ({
    p,
    usd: parseFloat(String(p.price ?? '').replace(/[^\d.]/g, '')) || Number.POSITIVE_INFINITY,
    g: p.gems,
  }))
  scored.sort((a, b) => a.usd - b.usd || a.g - b.g)
  return scored[0]?.p.productId?.trim() ?? null
}
