import axios from 'axios'
import { env } from '@/env'

// همون الگوی extractErrorMessage در PromptExtractionCard.tsx/NivoCalPage.tsx/VideoEditForms.tsx —
// پیام واقعی بک‌اند (مثلاً «اعتبار فروشگاه کافی نیست») را نشان می‌دهد، نه یک متن ثابت
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: string } | undefined)?.message
    if (message) return message
  }
  return fallback
}

// فیدبک کاربر ۱۴۰۵/۰۷/۲۱ — محصول با variant (سایز/رنگ) موجودی واقعی‌اش جمع موجودی ترکیب‌هاست؛
// Product.stock آن حالت معنی ندارد (۰ می‌ماند) و نباید باعث بج «ناموجود» شود
export function effectiveStock(p: { stock: number; optionTypes?: unknown[]; variants?: { stock: number }[] }): number {
  if (p.optionTypes?.length && p.variants) return p.variants.reduce((sum, v) => sum + v.stock, 0)
  return p.stock
}

// عمومی، بدون auth — عیناً همان مسیر که ShopUiBlocks.tsx برای چت خریدار استفاده می‌کند
export function productImageUrl(productId: string, key: string): string {
  return `${env.VITE_API_URL}/v2/products/${productId}/images/${key}`
}

// docs/PRD-product-strategy-and-roadmap.md بخش ۵.۱۴ — عینا همون الگوی بالا، برای عکس پروفایل فروشگاه
export function storeLogoUrl(storeId: string, key: string): string {
  return `${env.VITE_API_URL}/v2/stores/${storeId}/logo/${key}`
}

// docs/PRD-product-video.md — عیناً همون الگوی productImageUrl بالا
export function productVideoUrl(productId: string, key: string): string {
  return `${env.VITE_API_URL}/v2/products/${productId}/video/${key}`
}
