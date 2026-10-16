import { useCallback, useEffect, useRef, useState } from 'react'
import { env } from '@/env'
import type { PublicStoreAbout } from '@/types/api'

// docs/PRD-buyer-chat-redesign.md B4 — اطلاعات عمومی «درباره‌ی فروشگاه»؛ یک‌بار و بی‌صدا گرفته می‌شود
// (برای چیپ‌های اعتماد و خط انتقال به فروشنده). شکست شبکه فقط یعنی آن خطوط نمایش داده نمی‌شوند
export function useStoreAbout(slug: string) {
  const [about, setAbout] = useState<PublicStoreAbout | null>(null)
  const [failed, setFailed] = useState(false)
  const startedRef = useRef<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${env.VITE_API_URL}/v2/stores/${slug}/about`)
      if (!res.ok) throw new Error('request failed')
      const data = (await res.json()) as Partial<PublicStoreAbout> | null
      // پاسخ نامعتبر (مثلاً پروکسی) مثل خطا رفتار می‌کند، نه کرش در شیت
      if (!data || typeof data.name !== 'string' || typeof data.memberSince !== 'string' || !Array.isArray(data.paymentMethods)) {
        throw new Error('bad shape')
      }
      setAbout(data as PublicStoreAbout)
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }, [slug])

  useEffect(() => {
    if (startedRef.current === slug) return
    startedRef.current = slug
    void load()
  }, [slug, load])

  return { about, failed, reload: load }
}
