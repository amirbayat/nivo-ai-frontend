import { compressImage } from '@/lib/compressImage'
import { fa } from '@/locales/fa'

// docs/PRD-seller-panel-simplification.md §4.1 — همه‌ی آپلود عکس فروشنده (محصول، لوگو، batch)
// از همین‌جا رد می‌شود: HEIC آیفون ← JPEG (همان الگوی MessageInput.tsx)، بعد فشرده‌سازی، و اگر
// باز هم بالای ۵MB بود خطای فارسی (سقف سرور ۵MB است).
const MAX_BYTES = 5 * 1024 * 1024

export class PrepareImageError extends Error {
  constructor(message: string = fa.seller.panel.imageTooLarge) {
    super(message)
    this.name = 'PrepareImageError'
  }
}

export function isHeic(file: File): boolean {
  return /^image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
}

async function heicToJpeg(file: File): Promise<File> {
  const { default: heic2any } = await import('heic2any')
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
  const blob = Array.isArray(converted) ? converted[0] : converted
  return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
}

export async function prepareImage(file: File): Promise<File> {
  const source = isHeic(file) ? await heicToJpeg(file) : file
  const result = await compressImage(source)
  if (result.size > MAX_BYTES) throw new PrepareImageError()
  return result
}
