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

// عمومی، بدون auth — عیناً همان مسیر که ShopUiBlocks.tsx برای چت خریدار استفاده می‌کند
export function productImageUrl(productId: string, key: string): string {
  return `${env.VITE_API_URL}/v2/products/${productId}/images/${key}`
}

// docs/PRD-product-strategy-and-roadmap.md بخش ۵.۱۴ — عینا همون الگوی بالا، برای عکس پروفایل فروشگاه
export function storeLogoUrl(storeId: string, key: string): string {
  return `${env.VITE_API_URL}/v2/stores/${storeId}/logo/${key}`
}
