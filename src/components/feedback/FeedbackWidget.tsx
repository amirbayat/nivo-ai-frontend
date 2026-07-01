import { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'
import { useSubmitFeedback } from '@/queries/feedback.queries'
import { fa } from '@/locales/fa'

type Category = 'FEATURE_REQUEST' | 'BUG' | 'UX' | 'PRICING' | 'GENERAL'

const CATEGORIES: Category[] = ['FEATURE_REQUEST', 'BUG', 'UX', 'PRICING', 'GENERAL']

export function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<Category>('GENERAL')
  const [content, setContent] = useState('')
  const [sent, setSent] = useState(false)
  const mutation = useSubmitFeedback()
  const containerRef = useRef<HTMLDivElement>(null)

  // close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSubmit = () => {
    if (!content.trim()) return
    mutation.mutate(
      { content: content.trim(), category },
      {
        onSuccess: () => {
          setSent(true)
          setContent('')
          setTimeout(() => {
            setSent(false)
            setOpen(false)
          }, 2500)
        },
      },
    )
  }

  const handleClose = () => {
    setOpen(false)
    setSent(false)
    setContent('')
    setCategory('GENERAL')
  }

  return (
    <div ref={containerRef} className="relative">
      {/* trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        title={fa.feedback.title}
        className={clsx(
          'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors',
          open
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            : 'bg-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-700 border border-transparent',
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" className="size-3.5">
          <path
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>{fa.feedback.title}</span>
      </button>

      {/* dropdown panel */}
      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/40 overflow-hidden z-50">
          <div className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
            <span className="text-sm font-medium text-slate-200">{fa.feedback.title}</span>
            <button
              onClick={handleClose}
              className="size-6 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" className="size-4">
                <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {sent ? (
            <div className="flex flex-col items-center gap-3 px-4 py-8">
              <div className="size-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="size-6 text-emerald-400">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm text-slate-300 text-center">{fa.feedback.sent}</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={clsx(
                      'rounded-lg px-2.5 py-1 text-xs transition-colors',
                      category === cat
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-500 border border-slate-700/60 hover:border-slate-600',
                    )}
                  >
                    {fa.feedback.categories[cat]}
                  </button>
                ))}
              </div>

              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={fa.feedback.placeholder}
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-700/60 bg-slate-800/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />

              <button
                onClick={handleSubmit}
                disabled={!content.trim() || mutation.isPending}
                className={clsx(
                  'w-full rounded-xl py-2.5 text-sm font-medium transition-all',
                  content.trim() && !mutation.isPending
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed',
                )}
              >
                {mutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    {fa.common.loading}
                  </span>
                ) : (
                  fa.feedback.send
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
