import { useEffect, useMemo, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { extractErrorMessage } from '@/lib/sellerProduct'
import { buildGuidePrompt, buildGuideOpeningMessage, GUIDE_PROMPT_TITLES } from '@/lib/guideAssistantPrompts'
import { useAnalyzeOwnerNotes, useTranscribeAudio } from '@/queries/seller.queries'
import { useGuideAssistantChat, synthesizeGuideVoice } from '@/hooks/useGuideAssistantChat'
import type { AnalyzeOwnerNotesResult } from '@/types/api'

// docs/PRD-seller-guide-assistant-modal.md بخش ۳.۳ — جایگزین کامل GuidePromptModal (کپی
// پرامپت → ChatGPT بیرونی → پیست نتیجه) فقط برای store-setup/product: یک چت زنده‌ی داخل اپ،
// متن یا صدا به‌عنوان ورودی، پخش صوتی اختیاری روی هر پاسخ. همون systemPrompt قبلی
// (buildGuidePrompt) حالا به‌جای متن کپی‌شدنی، هم به‌عنوان حباب اول چت نمایش داده می‌شود هم
// system prompt واقعی سمت سرور است — هیچ منطق پرامپتی دوباره نوشته نشد.
export function GuideAssistantModal({
  open,
  onClose,
  context,
  storeId,
  productId,
  category,
  businessType,
  storeName,
  onResult,
}: {
  open: boolean
  onClose: () => void
  context: 'store-setup' | 'product'
  storeId: string
  productId?: string
  category?: string | null
  businessType?: 'PRODUCT_SALES' | 'APPOINTMENT_BOOKING'
  storeName?: string | null
  onResult?: (result: AnalyzeOwnerNotesResult) => void
}) {
  const { messages, sending, error, userMessageCount, atCap, sendMessage, reset } =
    useGuideAssistantChat(storeId)
  const analyze = useAnalyzeOwnerNotes(storeId)
  const transcribe = useTranscribeAudio(storeId)

  const [draft, setDraft] = useState('')
  const [recording, setRecording] = useState(false)
  const [voiceLoadingIndex, setVoiceLoadingIndex] = useState<number | null>(null)
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const voiceCacheRef = useRef<Map<number, string>>(new Map())
  const scrollRef = useRef<HTMLDivElement>(null)

  const systemPrompt = useMemo(
    () => buildGuidePrompt(context, { category, businessType, name: storeName }),
    [context, category, businessType, storeName],
  )
  const openingMessage = useMemo(
    () => buildGuideOpeningMessage(context, { name: storeName, category, businessType }),
    [context, storeName, category, businessType],
  )

  useEffect(() => {
    if (!open) return
    reset()
    setDraft('')
    analyze.reset()
    for (const url of voiceCacheRef.current.values()) URL.revokeObjectURL(url)
    voiceCacheRef.current = new Map()
    setPlayingIndex(null)
    setVoiceLoadingIndex(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    await sendMessage(systemPrompt, text)
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop()
      setRecording(false)
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      alert(fa.shop.micNotSupported)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        transcribe.mutate(blob, {
          onSuccess: ({ text }) => {
            const trimmed = text.trim()
            if (trimmed) setDraft(prev => (prev ? `${prev}\n${trimmed}` : trimmed))
          },
        })
      }
      recorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      alert(fa.shop.micNotSupported)
    }
  }

  async function playVoice(index: number, text: string) {
    if (voiceLoadingIndex !== null) return
    const audio = audioRef.current
    if (!audio) return
    const cached = voiceCacheRef.current.get(index)
    if (cached) {
      audio.src = cached
      void audio.play()
      setPlayingIndex(index)
      return
    }
    setVoiceLoadingIndex(index)
    try {
      const blob = await synthesizeGuideVoice(storeId, text)
      const url = URL.createObjectURL(blob)
      voiceCacheRef.current.set(index, url)
      audio.src = url
      void audio.play()
      setPlayingIndex(index)
    } catch {
      alert(fa.seller.panel.guideAssistant.voiceError)
    } finally {
      setVoiceLoadingIndex(null)
    }
  }

  function finish() {
    const rawText = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n\n')
    if (!rawText.trim()) return
    analyze.mutate(
      {
        entityType: context === 'product' ? 'PRODUCT' : 'STORE',
        productId,
        rawText,
      },
      {
        onSuccess: result => {
          onResult?.(result)
          onClose()
        },
      },
    )
  }

  const t = fa.seller.panel.guideAssistant

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50 flex flex-col bg-[var(--bg)] transition-transform duration-300 ease-out',
        open ? 'translate-y-0' : 'pointer-events-none translate-y-full',
      )}
      role="dialog"
      aria-modal="true"
      aria-label={GUIDE_PROMPT_TITLES[context]}
    >
      <audio ref={audioRef} onEnded={() => setPlayingIndex(null)} className="hidden" />

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
          {GUIDE_PROMPT_TITLES[context]}
        </span>
        <span className="w-8 shrink-0" />
      </div>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
        <div className="max-w-[90%] self-start rounded-2xl rounded-tr-sm border border-slate-700 light:border-slate-300 bg-slate-800/60 light:bg-slate-50 px-3.5 py-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-200 light:text-slate-800">
          {openingMessage}
        </div>

        {messages.map((m, i) => (
          <div
            key={i}
            className={clsx(
              'max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
              m.role === 'user'
                ? 'self-end rounded-tl-sm border border-emerald-500/30 bg-emerald-500/10 text-emerald-100 light:text-emerald-900'
                : 'self-start rounded-tr-sm border border-slate-700 light:border-slate-300 bg-slate-800/60 light:bg-slate-50 text-slate-200 light:text-slate-800',
            )}
          >
            {m.content || (sending && i === messages.length - 1 ? t.thinking : '')}
            {m.role === 'assistant' && m.content && (
              <button
                type="button"
                onClick={() => void playVoice(i, m.content)}
                disabled={voiceLoadingIndex !== null}
                className="mt-2 block text-[11px] font-semibold text-emerald-400 hover:underline disabled:opacity-50"
              >
                {voiceLoadingIndex === i ? '…' : playingIndex === i ? t.playing : t.play}
              </button>
            )}
          </div>
        ))}

        {error && <p className="text-xs text-red-400">{error}</p>}
        {analyze.isError && (
          <p className="text-xs text-red-400">
            {extractErrorMessage(analyze.error, fa.seller.panel.guidePrompt.analyzeError)}
          </p>
        )}

        {atCap && !analyze.isPending && <p className="text-xs text-amber-400">{t.capReached}</p>}
      </div>

      <div
        className="flex shrink-0 flex-col gap-2 border-t border-slate-700/50 light:border-slate-200 px-5 py-3"
        style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}
      >
        {userMessageCount > 0 && (
          <button
            type="button"
            onClick={finish}
            disabled={analyze.isPending}
            className="w-full rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {analyze.isPending ? fa.seller.panel.guidePrompt.analyzing : t.finish}
          </button>
        )}
        {userMessageCount === 0 && <p className="text-center text-[11px] text-slate-500">{t.finishHint}</p>}

        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
            dir="auto"
            rows={2}
            disabled={sending || atCap}
            placeholder={t.inputPlaceholder}
            className="flex-1 resize-none rounded-2xl border border-slate-700 light:border-slate-300 bg-slate-800/60 light:bg-white px-3.5 py-2.5 text-sm text-slate-200 light:text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void toggleRecording()}
            disabled={sending || atCap || transcribe.isPending}
            className={clsx(
              'shrink-0 rounded-full px-3 py-3 text-sm',
              recording ? 'animate-pulse bg-red-500/20 text-red-400' : 'bg-[var(--chip-bg)] text-slate-300 light:text-slate-600',
            )}
            style={{ border: '1px solid var(--chip-border)' }}
          >
            {transcribe.isPending ? '…' : '🎙️'}
          </button>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!draft.trim() || sending || atCap}
            className="shrink-0 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
          >
            {t.send}
          </button>
        </div>
      </div>
    </div>
  )
}
