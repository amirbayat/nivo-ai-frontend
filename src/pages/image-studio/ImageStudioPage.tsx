import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useConversation, useCreateConversation } from '@/queries/conversation.queries'
import { useChat } from '@/hooks/useChat'
import { useChatStore } from '@/store/chat.store'
import { MessageInput } from '@/components/chat/MessageInput'
import { ChatImage } from '@/components/chat/MessageList'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import type { Message } from '@/types/api'

// docs/PRD-openrouter-migration.md §۱۳-۱۴ — استودیوی تولید/ویرایش عکس به‌سبک Google Labs/Whisk:
// پنل کنترل ثابت (composer) + گالری کنار هم، به‌جای جمع‌شدن به چت. طبق تصمیم معماری §۱۴.۲،
// این یک entity جدید نیست — همان Conversation/useChat موجود چت است، فقط با یک UI تخصصی روی آن؛
// MessageInput همان کامپوننت مشترک چت است (ضمیمه‌ی عکس/حفظ چهره/مدل تولید عکس/حالت سریع-با تفکر
// از قبل در آن پیاده‌سازی شده — چیز جدیدی لازم نبود).
const SOFT_CAP = 10

interface PendingMessage {
  content: string
  images?: string[]
  imageModel?: string
  preserveFace?: boolean
}

export function ImageStudioPage() {
  const { id } = useParams<{ id?: string }>()
  const { isStreaming } = useChatStore()
  const navigate = useNavigate()
  const createConv = useCreateConversation()

  const handleFirstMessage = async (
    content: string,
    images?: string[],
    imageModel?: string,
    preserveFace?: boolean,
  ) => {
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

  if (!id) {
    return <StudioStart onSend={handleFirstMessage} isCreating={createConv.isPending} />
  }

  return <ActiveStudio key={id} conversationId={id} isStreaming={isStreaming} />
}

function StudioHeader({ title, count }: { title: string; count?: number }) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center gap-3 border-b border-slate-700/50 px-4 py-3 sm:px-6 sm:py-4">
      <button
        onClick={() => navigate('/')}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-colors"
        aria-label="بازگشت به خانه"
      >
        {/* chevron-right — «بازگشت» در RTL باید رو به راست اشاره کند (CLAUDE.md) */}
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </button>
      <h2 className="truncate text-sm font-medium text-slate-200">{title}</h2>
      {typeof count === 'number' && (
        <span className="mr-auto shrink-0 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-2.5 py-1 text-[11px] text-emerald-300">
          {`${count} از ${SOFT_CAP} عکس`}
        </span>
      )}
    </div>
  )
}

function StudioStart({ onSend, isCreating }: {
  onSend: (content: string, images?: string[], imageModel?: string, preserveFace?: boolean) => void
  isCreating: boolean
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <StudioHeader title="تولید و ویرایش عکس" />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-6 sm:p-8">
        <div className="text-center">
          <p className="text-lg font-medium text-slate-300">چه عکسی برات بسازم؟</p>
          <p className="mt-1 text-sm text-slate-600">توصیف کن یا یه عکس ضمیمه کن — نتیجه رو در چند ثانیه ببین</p>
        </div>
        <div className="w-full max-w-2xl">
          <MessageInput onSend={onSend} disabled={isCreating} />
        </div>
        {/* «پرامپت آماده» (docs/PRD-openrouter-migration.md §۱۴.۴) — به‌جای ساختن یک کتابخانه‌ی
            جدا، همان صفحه‌ی Discover موجود (سرچ/فیلتر/گالری سبک) بازاستفاده می‌شود. نکته: انتخاب
            یک سبک از آنجا فعلاً به /chat/:id می‌رود (مسیر تولید دیسکاوری مستقل از این صفحه است)،
            نه به همین استودیو — یکپارچه‌سازی کامل‌تر یک قدم بعدی است */}
        <Link
          to="/discover"
          className="flex items-center gap-2 rounded-full border border-slate-700/60 px-4 py-2 text-xs text-slate-400 transition-colors hover:border-emerald-500/40 hover:text-emerald-300"
        >
          <svg viewBox="0 0 24 24" fill="none" className="size-3.5">
            <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" fill="currentColor" />
          </svg>
          پرامپت آماده
        </Link>
      </div>
    </div>
  )
}

function ActiveStudio({ conversationId, isStreaming }: { conversationId: string; isStreaming: boolean }) {
  const { data, isLoading } = useConversation(conversationId)
  const { sendMessage } = useChat(conversationId)
  const navigate = useNavigate()
  const location = useLocation()
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const pendingRef = useRef<PendingMessage | null>(
    (location.state as { initialMessage?: PendingMessage } | null)?.initialMessage ?? null,
  )

  useEffect(() => {
    const msg = pendingRef.current
    if (msg && !isLoading && data) {
      pendingRef.current = null
      window.history.replaceState({}, '')
      void sendMessage(msg.content, msg.images, msg.imageModel, msg.preserveFace)
    }
  }, [isLoading, data, sendMessage])

  // گالری = فقط عکس‌های تولیدشده توسط هوش مصنوعی (پیام‌های ASSISTANT) — عکس‌های مرجعی که
  // خودِ کاربر ضمیمه کرده بخشی از «نتیجه» نیستند، در MessageInput/بالای پیام کاربر دیده می‌شوند
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

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    )
  }
  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-500 text-sm">
        مشکلی در بارگذاری این گفتگو پیش اومد
      </div>
    )
  }

  // توصیه، نه محدودیت سخت — تولید عکس بعد از این نقطه هم کاملاً فعال می‌ماند
  // (docs/PRD-openrouter-migration.md §۱۳.۷: «مجبورش نکن»)
  const nearCap = gallery.length >= SOFT_CAP

  return (
    // موبایل: ستونی (گالری بالا/اسکرول‌شونده، پنل پایین همیشه در دید) — دسکتاپ: کنار هم
    // (پنل راست، گالری چپ در RTL). docs/PRD-openrouter-migration.md §۱۴.۴ («چیدمان کنار-هم
    // دسکتاپ روی موبایل به دو ناحیه‌ی روی‌هم تبدیل می‌شود»)
    <div className="flex flex-1 flex-col overflow-hidden sm:flex-row">
      {/* پنل کنترل — دسکتاپ: راست (اولین فرزند در RTL)، موبایل: پایین */}
      <div className="order-2 flex shrink-0 flex-col border-t border-slate-700/50 sm:order-1 sm:w-full sm:max-w-md sm:border-t-0 sm:border-l">
        <div className="hidden sm:block">
          <StudioHeader title={data.title ?? 'تولید و ویرایش عکس'} count={gallery.length} />
        </div>

        {nearCap && (
          <div className="mx-4 mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-3 text-xs leading-relaxed text-amber-200">
            از {SOFT_CAP} عکس پیشنهادی این گفتگو گذشتی — برای بهینه‌کردن مصرف اعتبارت، پیشنهاد
            می‌کنیم یک گفتگوی جدید شروع کنی. البته ادامه‌ی همینجا هم کاملاً امکان‌پذیره.
            <button
              onClick={() => navigate('/image')}
              className="mt-2 block w-full rounded-lg bg-amber-500/15 py-1.5 text-center font-medium text-amber-100 transition-colors hover:bg-amber-500/25"
            >
              + گفتگوی جدید
            </button>
          </div>
        )}

        <div className="hidden flex-1 sm:block" />
        <MessageInput onSend={sendMessage} sending={isStreaming} />
      </div>

      {/* گالری — دسکتاپ: چپ، موبایل: بالا (اسکرول‌شونده) */}
      <div className="order-1 flex-1 overflow-y-auto p-6 sm:order-2">
        <div className="sm:hidden">
          <StudioHeader title={data.title ?? 'تولید و ویرایش عکس'} count={gallery.length} />
        </div>
        {gallery.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-600">
            <p className="text-sm">هنوز عکسی نساختی</p>
            <p className="text-xs">یه توصیف بنویس و از پنل کناری بفرست</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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

      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} analyticsSource="image_studio" />
      )}
    </div>
  )
}
