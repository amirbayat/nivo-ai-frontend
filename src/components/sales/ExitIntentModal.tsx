import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

const STORAGE_KEY = 'nivo:exit-intent-shown'

export function ExitIntentModal() {
  const [visible, setVisible] = useState(false)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const alreadyShown = localStorage.getItem(STORAGE_KEY)
    if (alreadyShown) return

    function onMouseLeave(e: MouseEvent) {
      if (e.clientY <= 0) {
        setVisible(true)
        localStorage.setItem(STORAGE_KEY, '1')
        document.removeEventListener('mouseleave', onMouseLeave)
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', onMouseLeave)
    }, 8000)  // only trigger after 8s on page

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  async function submit() {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length < 10) return
    setLoading(true)
    try {
      await api.post('/sales/lead', {
        phone: cleaned,
        source: 'exit_intent',
        sessionId: localStorage.getItem('nivo:sales-session') ?? undefined,
      })
      setDone(true)
    } catch {
      // best-effort
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void submit()
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="قبل از رفتن"
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        style={{ animation: 'exitSlideIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}
      >
        <button
          onClick={() => setVisible(false)}
          className="absolute top-4 left-4 text-slate-600 hover:text-slate-400 transition-colors"
          aria-label="بستن"
        >
          <svg viewBox="0 0 16 16" fill="none" className="size-4">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {!done ? (
          <>
            <div className="mb-5 text-center">
              <div className="mx-auto mb-3 size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <span className="text-2xl">🎁</span>
              </div>
              <h3 className="text-base font-bold text-slate-100">صبر کن!</h3>
              <p className="mt-1.5 text-sm text-slate-400">
                شماره‌ات رو بذار تا وقتی تخفیف داشتیم بهت خبر بدیم.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="۰۹۱۲..."
                type="tel"
                inputMode="numeric"
                className="flex-1 rounded-xl border border-slate-600 bg-slate-800 px-3.5 py-2.5
                  text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none
                  focus:border-amber-500/50 transition-colors direction-ltr text-left"
                aria-label="شماره موبایل"
              />
              <button
                onClick={() => void submit()}
                disabled={loading || phone.replace(/\D/g, '').length < 10}
                className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-900
                  hover:bg-amber-400 active:scale-95 disabled:opacity-40 transition-all"
              >
                {loading ? '...' : 'ثبت'}
              </button>
            </div>

            <p className="mt-3 text-center text-xs text-slate-600">
              اسپم نمی‌فرستیم. فقط تخفیف‌های ویژه.
            </p>
          </>
        ) : (
          <div className="py-4 text-center">
            <div className="mx-auto mb-3 size-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <svg viewBox="0 0 20 20" fill="none" className="size-6 text-emerald-400">
                <path d="M4 10l4.5 4.5L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-200">ثبت شد!</p>
            <p className="mt-1 text-xs text-slate-500">به محض تخفیف بهت خبر می‌دیم.</p>
            <button
              onClick={() => setVisible(false)}
              className="mt-4 text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              بستن
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes exitSlideIn {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}
