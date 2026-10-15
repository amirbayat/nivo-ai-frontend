import { useEffect, useRef } from 'react'
import { fa } from '@/locales/fa'

// R2.1 — صدای کوتاه + عنوان تب وقتی شمارنده‌ی رسید/توجه زیاد شد. صدا فقط بعد از اولین
// تعامل کاربر با صفحه پخش می‌شود (سیاست autoplay مرورگرها)؛ قبل از آن فقط عنوان عوض می‌شود.
let userInteracted = false
let listening = false

function listenForInteraction() {
  if (listening || typeof window === 'undefined') return
  listening = true
  const mark = () => {
    userInteracted = true
    window.removeEventListener('pointerdown', mark)
    window.removeEventListener('keydown', mark)
  }
  window.addEventListener('pointerdown', mark)
  window.addEventListener('keydown', mark)
}

function beep() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
    osc.onended = () => void ctx.close()
  } catch {
    // صدا اختیاری است؛ خطا نباید پنل را بشکند
  }
}

export function useSellerAlerts(receipts: number | undefined, attention: number | undefined) {
  const baseTitle = useRef<string | null>(null)
  const prevTotal = useRef<number | null>(null)
  const total = receipts === undefined || attention === undefined ? undefined : receipts + attention

  useEffect(() => listenForInteraction(), [])

  useEffect(() => {
    if (total === undefined) return
    if (baseTitle.current === null) baseTitle.current = document.title
    // اولین مقدار فقط پایه است؛ صدا وقتی که شمارنده نسبت به poll قبلی بالا رفته
    if (prevTotal.current !== null && total > prevTotal.current && userInteracted) beep()
    prevTotal.current = total
    document.title =
      total > 0
        ? `(${total.toLocaleString('fa-IR')}) ${fa.seller.panel.alerts.titleNew} — ${baseTitle.current}`
        : baseTitle.current
  }, [total])

  // ترک پنل ← عنوان اصلی برگردد
  useEffect(
    () => () => {
      if (baseTitle.current !== null) document.title = baseTitle.current
    },
    [],
  )
}
