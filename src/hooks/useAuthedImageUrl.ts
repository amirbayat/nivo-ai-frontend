import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

// عکس‌های آپلودی/تولیدی چت دیگر presigned URL نیستند — یک مسیر نسبی از خود بک‌اند هستند
// (GET /conversations/:id/images/:filename، پشت JwtGuard + چک مالکیت) که تگ <img> نمی‌تواند
// هدر Authorization برایش بفرستد؛ پس با axios (که هدر واقعی کاربر را دارد) می‌گیریم و به
// blob URL محلی تبدیل می‌کنیم. رشته‌های base64 خام قدیمی (data:image/...) نیاز به فچ ندارند.
const cache = new Map<string, string>()

// یک گالری/تاریخچه با چند ده آیتم یعنی چند ده mount همزمان از این هوک — بدون این صف،
// همه‌شان یکجا axios.get می‌زنند و شبکه/MinIO را غرق می‌کنند (بک‌اند دیگر throttle نمی‌کند
// چون این مسیر SkipThrottle شده، ولی burst بی‌فایده هنوز باقی می‌ماند). حداکثر ۶ فچ همزمان،
// بقیه در صف منتظر می‌مانند تا یکی آزاد شود.
const MAX_CONCURRENT = 6
let active = 0
const queue: (() => void)[] = []

function runNext() {
  if (active >= MAX_CONCURRENT) return
  const next = queue.shift()
  if (!next) return
  active++
  next()
}

function scheduleFetch<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    queue.push(() => {
      task().finally(() => { active--; runNext() }).then(resolve, reject)
    })
    runNext()
  })
}

// «افزودن به پرامپت» از گالری — برخلاف useAuthedImageUrl (که فقط برای نمایش، object URL کش‌شده
// می‌خواهد)، اینجا باید یک data URL واقعی (base64) برگردد چون همان چیزی است که کامپوزر چت
// (studioDraftImages) برای فرستادن/آپلود دوباره انتظار دارد — همیشه یک فچ تازه، بدون کش مشترک
export async function fetchImageAsDataUrl(src: string): Promise<string> {
  if (src.startsWith('data:')) return src
  const res = await scheduleFetch(() => api.get(src, { responseType: 'blob' }))
  const blob = res.data as Blob
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function useAuthedImageUrl(src: string): string | undefined {
  const [url, setUrl] = useState<string | undefined>(() =>
    src.startsWith('data:') ? src : cache.get(src),
  )

  useEffect(() => {
    if (!src) { setUrl(undefined); return }
    if (src.startsWith('data:')) { setUrl(src); return }
    const cached = cache.get(src)
    if (cached) { setUrl(cached); return }

    let cancelled = false
    setUrl(undefined)
    scheduleFetch(() => api.get(src, { responseType: 'blob' }))
      .then(res => {
        if (cancelled) return
        const objectUrl = URL.createObjectURL(res.data as Blob)
        cache.set(src, objectUrl)
        setUrl(objectUrl)
      })
      .catch(() => { if (!cancelled) setUrl(undefined) })

    return () => { cancelled = true }
  }, [src])

  return url
}
