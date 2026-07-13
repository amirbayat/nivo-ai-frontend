import { useEffect, useState } from 'react'

// شمارش معکوس زنده تا یک لحظه‌ی مشخص (HH:MM:SS) — بین بنر محدودیت پیام و باکس هدیه/مهلت مشترک است
export function useCountdown(target: string | null): string | null {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!target) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [target])

  if (!target) return null
  const diffMs = Math.max(0, new Date(target).getTime() - now)
  const totalSec = Math.floor(diffMs / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}
