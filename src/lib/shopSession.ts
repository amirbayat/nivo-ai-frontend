// هویت مشتری ناشناس یک فروشگاه — مثل anonSession.ts ولی per-store، چون یک کاربر ممکن
// است چند لینک /shop/:slug مختلف را در طول زمان باز کند و هرکدام باید سشن جدای خودش را داشته باشد
export interface ShopSession {
  conversationId: string
  sessionToken: string
}

export interface ShopSessionHistoryEntry extends ShopSession {
  endedAt: number
}

const MAX_HISTORY = 15

function key(slug: string): string {
  return `shop_session_${slug}`
}

function historyKey(slug: string): string {
  return `shop_session_history_${slug}`
}

export function getShopSession(slug: string): ShopSession | null {
  const raw = localStorage.getItem(key(slug))
  if (!raw) return null
  try {
    return JSON.parse(raw) as ShopSession
  } catch {
    return null
  }
}

export function setShopSession(slug: string, session: ShopSession): void {
  localStorage.setItem(key(slug), JSON.stringify(session))
}

export function clearShopSession(slug: string): void {
  localStorage.removeItem(key(slug))
}

export function getShopSessionHistory(slug: string): ShopSessionHistoryEntry[] {
  const raw = localStorage.getItem(historyKey(slug))
  if (!raw) return []
  try {
    const list = JSON.parse(raw) as ShopSessionHistoryEntry[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

// فیدبک: کاربر چت جدید نمی‌توانست باز کند چون سشن قبلی برای همیشه resume می‌شد — با
// دکمه‌ی «گفتگوی جدید»، سشن فعلی (اگر بود) قبل از پاک‌شدن به تاریخچه منتقل می‌شود تا گم نشود
export function archiveCurrentSession(slug: string): void {
  const current = getShopSession(slug)
  if (!current) return
  const history = getShopSessionHistory(slug).filter((h) => h.conversationId !== current.conversationId)
  history.unshift({ ...current, endedAt: Date.now() })
  localStorage.setItem(historyKey(slug), JSON.stringify(history.slice(0, MAX_HISTORY)))
  clearShopSession(slug)
}
