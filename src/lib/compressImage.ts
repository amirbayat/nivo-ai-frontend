// 0.13n — عکس رسید از گالری گوشی اغلب ۵–۱۰MB است و سقف سرور ۵MB؛ قبل از آپلود فشرده می‌شود
// (حداکثر ۱۶۰۰px، JPEG با کیفیت ۰٫۸). اگر فشرده‌سازی ممکن نبود (مرورگر/فرمت)، فایل اصلی برمی‌گردد.
const MAX_SIDE = 1600
const QUALITY = 0.8

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
    // اگر فشرده‌شده بزرگ‌تر شد (عکس کوچک/PNG ساده) همان اصلی بهتر است
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}
