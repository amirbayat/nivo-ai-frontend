import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useConversation, useCreateConversation } from '@/queries/conversation.queries'
import { useChat } from '@/hooks/useChat'
import { useChatStore } from '@/store/chat.store'
import { useSidebarControl } from '@/components/layout/ChatLayout'
import { ChatImage, ImageGenCanvas } from '@/components/chat/MessageList'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { StudioComposer } from './StudioComposer'
import type { Message } from '@/types/api'

// docs/PRD-openrouter-migration.md §۱۳-۱۴ — استودیوی تولید/ویرایش عکس به‌سبک Google Labs/Whisk،
// پیکسل‌به‌پیکسل مطابق ImageStudioWorkspace/ImageStudioEmpty/ImageStudioCapAdvisory.dc.html در
// دیزاین‌کنوس. یک صفحه‌ی واحد است — چه گفتگو تازه باشد چه قدیمی، همیشه همان چیدمان دو‌ستونه
// (پنل راست + گالری چپ) را نشان می‌دهد، فقط گالری خالی/پر است. طبق تصمیم معماری §۱۴.۲، این یک
// entity جدید نیست — همان Conversation/useChat موجود چت، فقط با UI تخصصی.
const SOFT_CAP = 10

interface PendingMessage {
  content: string
  images?: string[]
  imageModel?: string
  preserveFace?: boolean
}

export function ImageStudioPage() {
  const { id } = useParams<{ id?: string }>()
  // key={id ?? 'new'} تضمین می‌کند وقتی از حالت «بدون گفتگو» به یک گفتگوی تازه‌ساخته‌شده
  // navigate می‌شویم، کامپوننت واقعاً remount شود — وگرنه pendingRef (پایین) با location.state
  // قدیمی (خالی) گیر می‌کرد، چون useRef فقط در اولین رندر مقداردهی می‌شود، نه با تغییر props/state
  return <StudioWorkspace key={id ?? 'new'} id={id} />
}

function StudioWorkspace({ id }: { id?: string }) {
  const { isStreaming } = useChatStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { openSidebar } = useSidebarControl()
  const createConv = useCreateConversation()
  const { data, isLoading } = useConversation(id ?? '')
  const { sendMessage } = useChat(id ?? '')

  const pendingRef = useRef<PendingMessage | null>(
    (location.state as { initialMessage?: PendingMessage } | null)?.initialMessage ?? null,
  )

  useEffect(() => {
    const msg = pendingRef.current
    if (msg && id && !isLoading && data) {
      pendingRef.current = null
      window.history.replaceState({}, '')
      void sendMessage(msg.content, msg.images, msg.imageModel, msg.preserveFace)
    }
  }, [id, isLoading, data, sendMessage])

  const handleSend = async (
    content: string,
    images?: string[],
    imageModel?: string,
    preserveFace?: boolean,
  ) => {
    if (id) {
      void sendMessage(content, images, imageModel, preserveFace)
      return
    }
    try {
      const conv = await createConv.mutateAsync({ model: 'optimal' })
      navigate(`/image/${conv.id}`, {
        state: { initialMessage: { content, images, imageModel, preserveFace } },
        replace: true,
      })
    } catch {
      // کاربر می‌تواند دوباره تلاش کند
    }
  }

  const isGeneratingImage = useChatStore(s => s.isGeneratingImage)
  const generatingImagePreview = useChatStore(s => s.generatingImagePreview)

  // گالری = فقط عکس‌های تولیدشده توسط هوش مصنوعی (پیام‌های ASSISTANT) — عکس‌های مرجعی که خودِ
  // کاربر ضمیمه کرده بخشی از «نتیجه» نیستند
  const gallery = useMemo(() => {
    if (!data) return []
    const out: { key: string; src: string }[] = []
    for (const m of data.messages as Message[]) {
      if (m.role === 'ASSISTANT' && m.images?.length) {
        m.images.forEach((src, i) => out.push({ key: `${m.id}-${i}`, src }))
      }
    }
    return out
  }, [data])

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const count = gallery.length
  const nearCap = count >= SOFT_CAP

  return (
    <div className="flex flex-1 flex-col overflow-hidden" style={{ background: '#020C18' }} dir="rtl">
      {/* top bar */}
      <div className="flex shrink-0 items-center justify-between px-5 pt-5 sm:px-10 sm:pt-7">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate('/')}
            className="flex size-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'rgba(148,163,184,0.10)', border: '1px solid rgba(148,163,184,0.22)', color: '#cbd5e1' }}
            aria-label="بازگشت به خانه"
          >
            {/* chevron-right — «بازگشت» در RTL باید رو به راست اشاره کند (CLAUDE.md) */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <span className="text-[17px] font-bold text-white">{data?.title || 'تولید و ویرایش عکس'}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-semibold"
            style={
              nearCap
                ? { background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.3)', color: '#fde68a' }
                : count > 0
                  ? { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.26)', color: '#d1fae5' }
                  : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.18)', color: '#64748b' }
            }
          >
            {`${count} از ${SOFT_CAP} عکس در این گفتگو`}
          </div>
          <button
            onClick={openSidebar}
            className="flex size-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/[0.06]"
            style={{ background: 'rgba(148,163,184,0.10)', border: '1px solid rgba(148,163,184,0.22)', color: '#cbd5e1' }}
            title="تاریخچه‌ی گفتگوها"
            aria-label="باز کردن تاریخچه‌ی گفتگوها"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
            </svg>
          </button>
        </div>
      </div>

      {/* توصیه، نه محدودیت سخت (docs/PRD-openrouter-migration.md §۱۳.۷: «مجبورش نکن») */}
      {nearCap && (
        <div
          className="mx-5 mt-4 flex shrink-0 flex-col gap-3 rounded-2xl px-5 py-3.5 sm:mx-10 sm:flex-row sm:items-center sm:justify-between"
          style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.26)' }}
        >
          <div className="flex items-center gap-3 text-[13.5px]" style={{ color: '#fde68a' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            از {SOFT_CAP} عکس پیشنهادی برای هر گفتگو گذشتی — برای بهینه‌کردن مصرف اعتبارت، پیشنهاد
            اکید می‌کنیم یک گفتگوی جدید شروع کنی. البته ادامه‌ی همینجا هم کاملاً امکان‌پذیره.
          </div>
          <button
            onClick={() => navigate('/image')}
            className="shrink-0 rounded-full px-5 py-2 text-[13px] font-bold"
            style={{ background: 'rgba(251,191,36,0.16)', border: '1px solid rgba(251,191,36,0.4)', color: '#fef3c7' }}
          >
            + گفتگوی جدید
          </button>
        </div>
      )}

      {/* workspace: پنل کنترل (راست) + گالری (چپ) — موبایل: ستونی */}
      <div className="flex flex-1 flex-col overflow-hidden sm:flex-row" style={{ padding: '20px 0' }}>
        <div
          className="order-2 flex shrink-0 flex-col sm:order-1 sm:w-[400px] sm:pr-10"
          style={{ borderTop: '1px solid rgba(148,163,184,0.14)' }}
        >
          <div className="pt-4 sm:pt-0">
            <StudioComposer onSend={handleSend} disabled={createConv.isPending} sending={isStreaming} />
          </div>
        </div>

        <div className="order-1 flex-1 overflow-y-auto px-5 sm:order-2 sm:px-10">
          <p className="mb-3.5 text-[13px]" style={{ color: '#64748b' }}>
            {count > 0 ? `گالری این گفتگو (${count})` : 'گالری این گفتگو'}
          </p>

          {count === 0 && !isGeneratingImage ? (
            <div className="flex flex-col items-center justify-center gap-3.5 py-16 text-center">
              <div
                className="flex size-16 items-center justify-center rounded-[20px]"
                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)', color: '#34d399' }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="M21 15.5l-5.2-5.2-9.3 9.3" />
                </svg>
              </div>
              <p className="text-[15px] font-semibold text-slate-100">هنوز عکسی نساختی</p>
              <p className="max-w-[280px] text-[13.5px] leading-relaxed" style={{ color: '#64748b' }}>
                یه توصیف بنویس یا از پرامپت‌های آماده استفاده کن و «ساخت عکس» رو بزن
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 pb-8 sm:grid-cols-3">
              {isGeneratingImage && (
                <div className="relative aspect-square overflow-hidden rounded-2xl" style={{ border: '1px solid rgba(16,185,129,0.28)' }}>
                  <ImageGenCanvas preview={generatingImagePreview} className="absolute inset-0 size-full" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <div className="size-8 animate-spin rounded-full border-2 border-slate-500/30" style={{ borderTopColor: '#34d399' }} />
                    <span className="text-[12px]" style={{ color: '#a7f3d0' }}>در حال ساخت...</span>
                  </div>
                </div>
              )}
              {gallery.map(g => (
                <ChatImage
                  key={g.key}
                  src={g.src}
                  alt="تصویر ساخته‌شده توسط هوش مصنوعی"
                  onClick={() => setLightboxSrc(g.src)}
                  className="aspect-square w-full cursor-pointer rounded-2xl object-cover ring-1 ring-fuchsia-500/20 transition-all hover:ring-fuchsia-400/50"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} analyticsSource="image_studio" />
      )}
    </div>
  )
}
