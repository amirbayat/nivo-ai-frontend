import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { buildGuidePrompt, CHATGPT_URL, GUIDE_PROMPT_TITLES } from '@/lib/guideAssistantPrompts'

// docs/PRD-seller-guide-assistant-modal.md بخش ۱.۱/۱.۲/۳.۱۱ — فاز ۱ (MVP) برای باکس دانش:
// چت زنده داخل اپ نیست؛ فروشنده خودش پرامپت را در ChatGPT بیرونی اجرا می‌کند، خروجی (جدول) را
// مستقیم در «ورود متن» صفحه‌ی باکس دانش پیست می‌کند (فیچر production جدا). store-setup/product
// (GuideAssistantModal) و bulk-import (همون، بخش ۳.۱۱) دیگر از این مسیر استفاده نمی‌کنند —
// همین الان تنها context باقی‌مانده knowledge-extraction است.
export function GuidePromptModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const prompt = buildGuidePrompt('knowledge-extraction')

  useEffect(() => {
    if (open) setCopied(false)
  }, [open])

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // کپی خودکار رد شد — فروشنده می‌تواند دستی از باکس زیر انتخاب کند
    }
  }

  const steps = fa.seller.panel.guidePrompt.steps

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50 flex flex-col bg-[var(--bg)] transition-transform duration-300 ease-out',
        open ? 'translate-y-0' : 'pointer-events-none translate-y-full',
      )}
      role="dialog"
      aria-modal="true"
      aria-label={GUIDE_PROMPT_TITLES['knowledge-extraction']}
    >
      <div
        className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-700/50 light:border-slate-200 px-5 pb-4"
        style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={fa.common.close}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-300 light:text-slate-600"
          style={{ background: 'var(--chip-bg)', border: '1px solid var(--chip-border)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <span className="min-w-0 flex-1 truncate text-center text-[14px] font-bold text-white light:text-slate-900">
          {GUIDE_PROMPT_TITLES['knowledge-extraction']}
        </span>
        <span className="w-8 shrink-0" />
      </div>

      <div
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4"
        style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
      >
        <ol className="flex flex-col gap-1.5 text-xs text-slate-400 light:text-slate-600">
          {steps.map((s, i) => (
            <li key={i}>
              <span className="font-bold text-slate-300 light:text-slate-700">{i + 1}.</span> {s}
            </li>
          ))}
        </ol>

        <div className="relative">
          <pre className="max-h-[260px] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-700 light:border-slate-300 bg-slate-900/40 light:bg-slate-50 px-3.5 py-3 text-xs leading-relaxed text-slate-200 light:text-slate-800">
            {prompt}
          </pre>
          <button
            type="button"
            onClick={() => void copyPrompt()}
            className="absolute left-2.5 top-2.5 rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-600"
          >
            {copied ? fa.seller.panel.guidePrompt.copied : fa.seller.panel.guidePrompt.copy}
          </button>
        </div>

        <a
          href={CHATGPT_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-3 text-sm font-bold text-emerald-300 light:text-emerald-700 hover:bg-emerald-500/20"
        >
          {fa.seller.panel.guidePrompt.openChatGpt} ↗
        </a>

        <p className="rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-slate-50 px-3.5 py-3 text-xs leading-relaxed text-slate-400 light:text-slate-600">
          {fa.seller.panel.guidePrompt.knowledgeExtractionHint}
        </p>
      </div>
    </div>
  )
}
