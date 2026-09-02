import { useRef, useState, type KeyboardEvent } from 'react'
import { useFeatureFlags } from '@/queries/config.queries'
import { useChatStore } from '@/store/chat.store'
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice'
import { resizeImage } from '@/components/chat/MessageInput'

// composer وسط‌چین حالت خالی چت — پیکسل‌به‌پیکسل مطابق ChatEmpty.dc.html در دیزاین‌کنوس
// (docs/PRD-openrouter-migration.md §۱۳-۱۴). فقط برای حالت خالی است؛ بعد از اولین پیام،
// ActiveChat مثل قبل از همان MessageInput مشترک/چسبیده‌به‌پایین استفاده می‌کند — این کامپوننت
// آن را عوض نمی‌کند، فقط برای این یک لحظه‌ی ورودی یک UI شیک‌تر می‌سازد.
export function ChatHeroComposer({ onSend, disabled }: {
  onSend: (content: string, images?: string[], imageModel?: string, preserveFace?: boolean) => void
  disabled?: boolean
}) {
  const { data: flags } = useFeatureFlags()
  const MAX_IMAGES = flags?.maxImagesPerMessage ?? 4
  const MAX_SIZE_BYTES = (flags?.maxImageSizeMb ?? 8) * 1024 * 1024
  const { thinkingMode, setThinkingMode } = useChatStore()
  const isTouchDevice = useIsTouchDevice()

  const [value, setValue] = useState('')
  const [images, setImages] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const canSend = (value.trim() || images.length > 0) && !disabled

  const submit = () => {
    if (!canSend) return
    onSend(value.trim(), images.length ? images : undefined, undefined, true)
    setValue('')
    setImages([])
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isTouchDevice) {
      e.preventDefault()
      submit()
    }
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    const remaining = MAX_IMAGES - images.length
    const toProcess = Array.from(files).slice(0, remaining)
    const results: string[] = []
    for (const file of toProcess) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > MAX_SIZE_BYTES) continue
      try { results.push(await resizeImage(file)) } catch { /* skip */ }
    }
    setImages(prev => [...prev, ...results].slice(0, MAX_IMAGES))
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="flex w-full max-w-[760px] flex-col items-center">
      {/* سریع / با تفکر */}
      <div
        className="mb-3.5 flex gap-1.5 rounded-full p-[5px]"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.18)' }}
      >
        <button
          type="button"
          onClick={() => setThinkingMode('fast')}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-bold"
          style={thinkingMode === 'fast' ? { background: 'rgba(124,58,237,0.16)', color: '#c4b5fd' } : { color: '#64748b' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
          سریع
        </button>
        <button
          type="button"
          onClick={() => setThinkingMode('smart')}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-bold"
          style={thinkingMode === 'smart' ? { background: 'rgba(124,58,237,0.16)', color: '#c4b5fd' } : { color: '#64748b' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z" />
          </svg>
          با تفکر
        </button>
      </div>

      {images.length > 0 && (
        <div className="mb-2 flex w-full flex-wrap gap-2">
          {images.map((src, idx) => (
            <div key={idx} className="group relative">
              <img src={src} className="size-14 rounded-xl border border-slate-600 object-cover" alt={`عکس پیوست‌شده ${idx + 1}`} />
              <button
                onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                className="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-xs leading-none text-slate-300 hover:text-white"
                aria-label="حذف عکس"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className="flex w-full items-center gap-3 rounded-full p-2.5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(124,58,237,0.32)', boxShadow: '0 0 50px rgba(124,58,237,0.08)' }}
      >
        <button
          onClick={submit}
          disabled={!canSend}
          className="flex shrink-0 items-center justify-center rounded-full"
          style={{ width: 44, height: 44, background: '#7c3aed', color: '#fff', opacity: canSend ? 1 : 0.6 }}
          aria-label="ارسال"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>

        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder="پیامتو بنویس، یا یه عکس ضمیمه کن..."
          rows={1}
          className="flex-1 resize-none bg-transparent text-[15px] text-slate-100 placeholder:text-slate-600 focus:outline-none"
          style={{ minHeight: 24 }}
        />

        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => void handleFiles(e.target.files)} />
        <button
          type="button"
          disabled={disabled || images.length >= MAX_IMAGES}
          onClick={() => fileRef.current?.click()}
          className="flex shrink-0 items-center justify-center rounded-full disabled:opacity-40"
          style={{ width: 38, height: 38, color: '#94a3b8' }}
          aria-label="افزودن عکس"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="M21 15.5l-5.2-5.2-9.3 9.3" />
          </svg>
        </button>
      </div>
    </div>
  )
}
