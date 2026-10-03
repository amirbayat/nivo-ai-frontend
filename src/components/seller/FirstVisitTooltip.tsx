import { useEffect, useState } from 'react'

// docs/PRD-seller-growth-tools-and-marketplace-trust.md بخش ۲.۳ — تولتیپ یک‌بارمصرف روی اولین
// ورود به هر تب اصلی. همان الگوی localStorage در ExitIntentModal.tsx، فقط کلید به‌ازای هر تب
function storageKey(id: string) {
  return `nivo:seller-tooltip-seen:${id}`
}

export function FirstVisitTooltip({ id, text }: { id: string; text: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(!localStorage.getItem(storageKey(id)))
  }, [id])

  if (!visible) return null

  function dismiss() {
    localStorage.setItem(storageKey(id), '1')
    setVisible(false)
  }

  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-3">
      <p className="flex-1 text-xs leading-relaxed text-emerald-200 light:text-emerald-800">{text}</p>
      <button onClick={dismiss} className="shrink-0 text-xs font-semibold text-emerald-400 hover:text-emerald-300 light:hover:text-emerald-600">
        متوجه شدم
      </button>
    </div>
  )
}
