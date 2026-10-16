import type { ShopMessage, ShopUiBlock } from '@/types/api'

type ProductCardBlock = Extract<ShopUiBlock, { type: 'PRODUCT_CARD' }>

// QA-18 — اگر همان محصول در «پیام قبلی بات» کارت شده، در پیام بعدی دوباره کارت نمی‌شود.
// خروجی: id پیام ← محصولاتی که باید نمایش داده شوند (فقط برای پیام‌های دارای PRODUCT_CARD).
export function dedupeProductCards(thread: ShopMessage[]): Map<string, ProductCardBlock['products']> {
  const result = new Map<string, ProductCardBlock['products']>()
  let prevAgentIds: Set<string> | null = null
  for (const m of thread) {
    if (m.role !== 'agent') continue
    const block = m.uiBlock
    if (block?.type === 'PRODUCT_CARD') {
      const shown = prevAgentIds ? block.products.filter((p) => !prevAgentIds!.has(p.id)) : block.products
      result.set(m.id, shown)
      prevAgentIds = new Set(block.products.map((p) => p.id))
    } else {
      prevAgentIds = null
    }
  }
  return result
}
