import { useMemo } from 'react'
import { fa } from '@/locales/fa'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ProductDetailSheet } from '@/components/shop/StoreProductGrid'
import { cartesianCombos, comboKey, type VariantDraft } from '@/lib/variantDraft'
import { UNLIMITED_STOCK_DISPLAY } from '@/lib/sellerProduct'
import type { PublicProduct } from '@/types/api'
import { useSellerStore } from '../SellerPanelLayout'

interface PreviewInput {
  name: string
  basePrice: number
  description: string
  images: string[]
  productId: string
  variants: VariantDraft
  alwaysInStock: boolean
  isWeightBased: boolean
}

// docs/PRD-seller-panel-simplification.md §4.12.2 — «ببین مشتری چی می‌بینه»: همان کامپوننت
// ProductDetailSheet خریدار، در حالت preview، از روی وضعیت فعلی فرم (پیش‌نویس هم کار می‌کند).
// عمداً /shop/:slug واقعی باز نمی‌شود؛ آن‌جا نشست و مکالمه‌ی واقعی خریدار ساخته می‌شود.
export function BuyerPreviewSheet({ open, onClose, product }: { open: boolean; onClose: () => void; product: PreviewInput }) {
  const { storeSlug } = useSellerStore()
  const preview = useMemo<PublicProduct>(() => {
    const options = product.variants.options
      .filter(o => o.name.trim() && o.values.length > 0)
      .map(o => ({ name: o.name.trim(), values: o.values }))
    const combos = cartesianCombos(product.variants.options).filter(c => !product.variants.removed.includes(comboKey(c)))
    return {
      id: product.productId || 'preview',
      name: product.name,
      basePrice: product.basePrice,
      stock: UNLIMITED_STOCK_DISPLAY,
      images: product.images,
      videos: [],
      description: product.description || null,
      isWeightBasedPricing: product.isWeightBased,
      weightGrams: null,
      purityKarat: null,
      goldPricingSummary: null,
      priceUnavailable: product.isWeightBased,
      options,
      variants: combos.map((c, i) => {
        const row = product.variants.rows[comboKey(c)]
        const stock = product.alwaysInStock ? UNLIMITED_STOCK_DISPLAY : Number(row?.stock || 0)
        return {
          id: `preview-${i}`,
          options: c,
          stock,
          price: row?.priceOverride ? Number(row.priceOverride) : product.basePrice,
        }
      }),
      ratingAvg: null,
      reviewCount: 0,
    }
  }, [product])

  return (
    <BottomSheet open={open} onClose={onClose} full title={fa.seller.v2.product.previewTitle}>
      <ProductDetailSheet preview product={preview} slug={storeSlug} shippingEstimate={null} shippingDaysText={null} onClose={onClose} />
    </BottomSheet>
  )
}
