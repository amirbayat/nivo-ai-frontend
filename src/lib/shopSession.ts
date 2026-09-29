// هویت مشتری ناشناس یک فروشگاه — مثل anonSession.ts ولی per-store، چون یک کاربر ممکن
// است چند لینک /shop/:slug مختلف را در طول زمان باز کند و هرکدام باید سشن جدای خودش را داشته باشد
export interface ShopSession {
  conversationId: string
  sessionToken: string
}

function key(slug: string): string {
  return `shop_session_${slug}`
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
