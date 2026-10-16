import { env } from '@/env'

// عمومی، بدون auth — عیناً همون الگوی productImageUrl در ShopUiBlocks.tsx
export function storeLogoUrl(storeId: string, key: string): string {
  return `${env.VITE_API_URL}/v2/stores/${storeId}/logo/${key}`
}

// عیناً همون الگوی avatarInitials در Sidebar.tsx — تا فروشگاهی عکس نگذاشته، به‌جای خالی‌ماندن
// یک دایره‌ی حروف‌اول نشان داده شود (بخش ۵.۱۴ داک — بند ۶)
export function avatarInitials(name?: string | null): string {
  if (!name) return ''
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].charAt(0)
  return parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
}

export function voiceAudioUrl(conversationId: string, key: string): string {
  // کلید ذخیره‌سازی شامل پیشوند «conversationId/» است (storage.service.ts uploadImage) —
  // باید encode شود وگرنه «/» داخلش روت :key را به چند سگمنت می‌شکند و 404 می‌گیرد (صدا هرگز
  // بارگذاری نمی‌شد، مستقل از مشکل WAV/MP3)
  return `${env.VITE_API_URL}/v2/chat/${conversationId}/voice/${encodeURIComponent(key)}`
}
