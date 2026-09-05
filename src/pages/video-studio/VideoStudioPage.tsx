import { useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { clsx } from 'clsx'
import { api } from '@/lib/api'
import { resizeImage } from '@/components/chat/MessageInput'
import { PlanUpgradeBadge } from '@/components/layout/PlanUpgradeBadge'
import { useModelCatalog } from '@/queries/plans.queries'
import {
  useCreateVideoProject,
  useProjectMessages,
  useRegenerateCharacters,
  useRequestShotVideo,
  useSelectCharacter,
  useSendMessage,
  useSetVideoStudioModels,
  useUploadVideoStudioImage,
  useVideoProject,
  type SetVideoStudioModelsDto,
} from '@/queries/videoStudio.queries'
import {
  CharacterGrid,
  ResultActionBar,
  ShotGrid,
  StudioVideo,
  VideoStudioEmptyState,
  getVideoStudioStage,
  type VideoStudioStage,
} from './VideoStudioGallery'
import { VideoStudioSettingsModal } from './VideoStudioSettingsModal'
import { VideoStudioHistoryDrawer } from './VideoStudioHistoryDrawer'
import { SimpleVideoForm } from './SimpleVideoForm'
import type { StudioMessage, StudioProject } from '@/types/api'

// docs/PRD-video-studio-chat-flow.md — صفحه‌ی واحد استودیوی ویدیو، بدون wizard/استپر.
//
// دستور صریح کاربر (بازطراحی ۱۴۰۵-۰۶-۱۳): نسخه‌ی قبلی این صفحه یک state machine ثابت بود —
// متن‌های از‌پیش‌نوشته + دکمه‌ی اجباری («ساخت طرح‌های کاراکتر»، «ساخت ویدیوی همه‌ی صحنه‌ها») بر
// اساس project.status، بدون اتصال به endpoint واقعی چت بک‌اند. الان به /messages واقعی
// (video-studio.service.ts/sendMessage) وصل است: هر پیام (اولین پیام هم همینطور) از تشخیص
// intent واقعی رد می‌شود و بک‌اند خودش تصمیم می‌گیرد کاراکتر/استوری‌برد/ویدیوی مستقیم بسازد یا
// فقط پاسخ بدهد — هیچ دکمه/chip ثابتی داخل چت نیست، فقط گفتگوی آزاد. باکس نوشتن هم به‌جای یک
// فرم کوچک ته صفحه، حالا خودِ ستون/مدال چت است (رنگ/گلوی امرالد، شبیه باکس تولید عکس) — پیام‌ها
// بالای همین باکس اسکرول می‌شوند و نوشتن دقیقاً پایینِ همین باکس بزرگ است.
//
// دسکتاپ: دو ستون (چت راست / گالری چپ) هر دو همیشه روی صفحه. موبایل: صفحه‌ی پایه گالری +
// نوار نوشتن جمع‌شده‌ی پایین صفحه؛ تپ‌کردن، مدال تمام‌صفحه‌ی چت (MobileChatModal) را باز
// می‌کند — دقیقاً مکانیزم StudioComposer.tsx (استودیوی عکس).

interface ModelPrefs {
  chatModelId: string | null
  photoModelId: string | null
  videoModelId: string | null
  imageAspectRatio: string | null
  videoAspectRatio: string | null
}

const PREF_KEYS: Record<keyof ModelPrefs, string> = {
  chatModelId: 'nivo:videoStudio:chatModelId',
  photoModelId: 'nivo:videoStudio:photoModelId',
  videoModelId: 'nivo:videoStudio:videoModelId',
  imageAspectRatio: 'nivo:videoStudio:imageAspectRatio',
  videoAspectRatio: 'nivo:videoStudio:videoAspectRatio',
}

function loadPrefs(): ModelPrefs {
  const out = {} as ModelPrefs
  for (const k of Object.keys(PREF_KEYS) as (keyof ModelPrefs)[]) {
    out[k] = localStorage.getItem(PREF_KEYS[k])
  }
  return out
}

function AssistantBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-purple-600 text-xs font-bold text-white shadow-[0_0_14px_rgba(16,185,129,0.25)]">
        AI
      </div>
      <div className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-slate-100">{children}</div>
    </div>
  )
}

function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-row-reverse gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
        ش
      </div>
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-emerald-500/[0.18] bg-emerald-500/[0.14] px-4 py-3 text-[13.5px] leading-relaxed text-emerald-50">
        {children}
      </div>
    </div>
  )
}

function ActionButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={clsx(
        'rounded-full px-4 py-2 text-[12.5px] font-bold text-[#02170f] disabled:opacity-50',
        props.className,
      )}
      style={{ background: '#10b981', ...props.style }}
    >
      {children}
    </button>
  )
}

function SecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={clsx('rounded-full px-4 py-2 text-[12.5px] font-semibold text-slate-200 disabled:opacity-50', props.className)}
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(148,163,184,0.24)', ...props.style }}
    >
      {children}
    </button>
  )
}

// باکس نوشتن — همیشه در دسترس، هیچ‌وقت با یک دکمه جایگزین نمی‌شود. «افزودن عکس» برای
// «این عکس رو برام ویدیو کن» طبق درخواست صریح کاربر (نمونه‌ی این جریان: عکس ضمیمه می‌شود،
// آپلود می‌شود، کلیدش به‌عنوان imageKey همراه پیام می‌رود — video-studio.service.ts خودش
// تشخیص می‌دهد که این یعنی generate_quick_video).
function ComposerBox({
  onSend,
  sending,
  submitLabel,
  placeholder,
}: {
  onSend: (text: string, imageKey?: string) => void
  sending: boolean
  submitLabel: string
  placeholder: string
}) {
  const [value, setValue] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const uploadImage = useUploadVideoStudioImage()
  const busy = sending || uploadImage.isPending

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    try {
      setImage(await resizeImage(file))
      setUploadError(null)
    } catch {
      setUploadError('پردازش عکس ناموفق بود')
    }
  }

  async function submit() {
    if ((!value.trim() && !image) || busy) return
    let imageKey: string | undefined
    if (image) {
      try {
        imageKey = (await uploadImage.mutateAsync(image)).key
      } catch {
        setUploadError('آپلود عکس ناموفق بود، دوباره امتحان کن')
        return
      }
    }
    onSend(value.trim() || 'این عکس رو برام ویدیو کن', imageKey)
    setValue('')
    setImage(null)
  }

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t px-6 py-5" style={{ borderColor: 'rgba(16,185,129,0.16)' }}>
      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
            e.target.value = ''
          }}
        />
        {image ? (
          <div className="relative">
            <img src={image} className="size-11 rounded-xl border object-cover" style={{ borderColor: 'rgba(16,185,129,0.35)' }} alt="عکس مرجع" />
            <button
              type="button"
              onClick={() => setImage(null)}
              className="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-full border text-xs leading-none text-slate-300"
              style={{ background: '#0f172a', borderColor: 'rgba(148,163,184,0.3)' }}
              aria-label="حذف عکس مرجع"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold text-slate-400"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.2)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
            </svg>
            افزودن عکس
          </button>
        )}
      </div>
      {uploadError && <p className="text-[11.5px] text-red-400">{uploadError}</p>}
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            void submit()
          }
        }}
        rows={2}
        placeholder={placeholder}
        className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-slate-100 placeholder:text-slate-600 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={(!value.trim() && !image) || busy}
        className="w-full rounded-full py-3.5 text-[15px] font-bold text-[#02170f] transition-opacity disabled:opacity-50"
        style={{ background: 'linear-gradient(90deg,#10b981,#34d399)' }}
      >
        {busy ? 'در حال ارسال...' : submitLabel}
      </button>
    </div>
  )
}

// ستون/مدال چت — یک باکس بزرگ و فول‌هایت (نه پیام‌های شناور + یک باکس کوچیک پایین): پیام‌ها
// بالای همین باکس اسکرول می‌شوند، نوشتن دقیقاً پایینِ همین باکس است
function ChatPanel({
  project,
  messages,
  onSend,
  sending,
  errorMsg,
  className,
}: {
  project: StudioProject | undefined
  messages: StudioMessage[]
  onSend: (text: string, imageKey?: string) => void
  sending: boolean
  errorMsg: string | null
  className?: string
}) {
  return (
    <div
      className={clsx('flex flex-1 flex-col overflow-hidden rounded-[28px]', className)}
      style={{
        background: 'linear-gradient(165deg, rgba(16,185,129,0.10) 0%, rgba(147,51,234,0.05) 55%, rgba(255,255,255,0.02) 100%)',
        border: '1.5px solid rgba(16,185,129,0.30)',
        boxShadow: '0 0 0 1px rgba(16,185,129,0.06), 0 24px 60px -24px rgba(16,185,129,0.35)',
      }}
    >
      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        {!project && (
          <AssistantBubble>
            سلام! بگو ایده‌ی ویدیویی که می‌خوای بسازیم چیه — یا یه عکس اضافه کن و بگو همون رو برات ویدیو کنم.
          </AssistantBubble>
        )}
        {/* حالت گذرا بلافاصله بعد از navigate (قبل از رسیدن اولین پیام واقعی از سرور) + پروژه‌های
            قدیمی از قبل از این بازطراحی که هنوز StudioMessage ندارند — initialPrompt را به‌عنوان
            اولین حباب کاربر نشان بده تا گفتگو خالی/عجیب دیده نشود */}
        {project && messages.length === 0 && <UserBubble>{project.initialPrompt}</UserBubble>}
        {messages.map(m =>
          m.role === 'user' ? (
            <UserBubble key={m.id}>{m.content}</UserBubble>
          ) : (
            <AssistantBubble key={m.id}>{m.content}</AssistantBubble>
          ),
        )}
        {errorMsg && <p className="mr-11 text-[12.5px] text-red-400">{errorMsg}</p>}
      </div>
      <ComposerBox
        onSend={onSend}
        sending={sending}
        submitLabel={project ? 'ارسال' : 'شروع'}
        placeholder={project ? 'بنویس چی می‌خوای — یا یه عکس اضافه کن...' : 'ایده‌ی ویدیوتو توصیف کن یا یه عکس اضافه کن...'}
      />
    </div>
  )
}

// مدال تمام‌صفحه‌ی چت روی موبایل — دقیقاً مکانیزم StudioComposer.tsx (استودیوی عکس): پشت این
// مدال همیشه گالری است، بستنش برمی‌گرداند به همان گالری
function MobileChatModal({
  open,
  onClose,
  project,
  messages,
  onSend,
  sending,
  errorMsg,
}: {
  open: boolean
  onClose: () => void
  project: StudioProject | undefined
  messages: StudioMessage[]
  onSend: (text: string, imageKey?: string) => void
  sending: boolean
  errorMsg: string | null
}) {
  return (
    <div
      className={clsx(
        'absolute inset-0 z-[25] flex flex-col overflow-hidden bg-[#020C18] transition-[transform,opacity] duration-300 ease-out sm:hidden',
        open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0',
      )}
    >
      <div
        className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-700/50 px-4 pb-3"
        style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}
      >
        <span className="text-[14.5px] font-bold text-white">گفتگو</span>
        <button
          type="button"
          onClick={onClose}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-300"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(148,163,184,0.24)' }}
          aria-label="بستن"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {!project && (
          <AssistantBubble>
            سلام! بگو ایده‌ی ویدیویی که می‌خوای بسازیم چیه — یا یه عکس اضافه کن و بگو همون رو برات ویدیو کنم.
          </AssistantBubble>
        )}
        {/* حالت گذرا بلافاصله بعد از navigate (قبل از رسیدن اولین پیام واقعی از سرور) + پروژه‌های
            قدیمی از قبل از این بازطراحی که هنوز StudioMessage ندارند — initialPrompt را به‌عنوان
            اولین حباب کاربر نشان بده تا گفتگو خالی/عجیب دیده نشود */}
        {project && messages.length === 0 && <UserBubble>{project.initialPrompt}</UserBubble>}
        {messages.map(m =>
          m.role === 'user' ? (
            <UserBubble key={m.id}>{m.content}</UserBubble>
          ) : (
            <AssistantBubble key={m.id}>{m.content}</AssistantBubble>
          ),
        )}
        {errorMsg && <p className="mr-11 text-[12.5px] text-red-400">{errorMsg}</p>}
      </div>
      <ComposerBox
        onSend={onSend}
        sending={sending}
        submitLabel={project ? 'ارسال' : 'شروع'}
        placeholder={project ? 'بنویس چی می‌خوای — یا یه عکس اضافه کن...' : 'ایده‌ی ویدیوتو توصیف کن یا یه عکس اضافه کن...'}
      />
    </div>
  )
}

export function VideoStudioPage() {
  const { id } = useParams<{ id?: string }>()
  return <VideoStudioWorkspace key={id ?? 'new'} id={id} />
}

function VideoStudioWorkspace({ id }: { id?: string }) {
  const navigate = useNavigate()
  const { data: catalog } = useModelCatalog()
  const { data: project, isLoading } = useVideoProject(id)
  const { data: messages } = useProjectMessages(id)

  const [prefs, setPrefs] = useState<ModelPrefs>(() => loadPrefs())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [player, setPlayer] = useState<{ videoKey: string; previewImageKey: string | null } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  const createProject = useCreateVideoProject()
  const setModels = useSetVideoStudioModels(id ?? '')
  const sendMessage = useSendMessage(id ?? '')
  const regenerateCharacters = useRegenerateCharacters(id ?? '')
  const selectCharacter = useSelectCharacter(id ?? '')
  const requestShotVideo = useRequestShotVideo(id ?? '')
  const [renderAllPending, setRenderAllPending] = useState(false)

  // دستور صریح کاربر: چیپ مدل چت/عکس این صفحه نباید کل کاتالوگ عمومی سایت را نشان بدهد — فقط
  // مدل‌هایی که ادمین از پنل مدل‌ها با `videoStudioEligible` علامت زده (نه allowlist هاردکد در
  // کد). مدل‌های ویدیو نیازی به این فیلتر ندارند چون کل کاتالوگ VIDEO_GEN ذاتاً مخصوص همین فیچر است.
  const chatModels = (catalog ?? []).filter(m => m.modelType === 'CHAT' && m.videoStudioEligible)
  const photoModels = (catalog ?? []).filter(m => m.modelType === 'IMAGE_GEN' && m.videoStudioEligible)
  const videoModels = (catalog ?? []).filter(m => m.modelType === 'VIDEO_GEN')

  const chatModelId = project?.chatModelId ?? prefs.chatModelId
  const photoModelId = project?.photoModelId ?? prefs.photoModelId
  const videoModelId = project?.videoModelId ?? prefs.videoModelId
  const imageAspectRatio = project?.imageAspectRatio ?? prefs.imageAspectRatio
  const videoAspectRatio = project?.videoAspectRatio ?? prefs.videoAspectRatio

  const stage: VideoStudioStage = getVideoStudioStage(project)

  function updateModel(field: keyof ModelPrefs, value: string) {
    localStorage.setItem(PREF_KEYS[field], value)
    setPrefs(prev => ({ ...prev, [field]: value }))
    if (id) setModels.mutate({ [field]: value } as SetVideoStudioModelsDto)
  }

  // نقطه‌ی ورود واحد چت — چه اولین پیام باشد چه پیام‌های بعدی، همیشه از تشخیص intent واقعی
  // بک‌اند رد می‌شود (video-studio.service.ts/sendMessage)، نه یک دکمه‌ی مخصوص هر مرحله
  async function handleSend(text: string, imageKey?: string) {
    setErrorMsg(null)
    if (!project) {
      setIsStarting(true)
      try {
        const created = await createProject.mutateAsync({ initialPrompt: text })
        const toSet: SetVideoStudioModelsDto = {}
        if (prefs.chatModelId) toSet.chatModelId = prefs.chatModelId
        if (prefs.photoModelId) toSet.photoModelId = prefs.photoModelId
        if (prefs.videoModelId) toSet.videoModelId = prefs.videoModelId
        if (prefs.imageAspectRatio) toSet.imageAspectRatio = prefs.imageAspectRatio
        if (prefs.videoAspectRatio) toSet.videoAspectRatio = prefs.videoAspectRatio
        if (Object.keys(toSet).length > 0) {
          await api.patch(`/video-studio/projects/${created.id}/models`, toSet).catch(() => undefined)
        }
        // اولین پیام واقعی را همین‌جا (قبل از navigate) می‌فرستیم تا intent واقعی تشخیص داده
        // شود — بعد از navigate کامپوننت با key جدید از نو mount می‌شود و همه‌چیز را از سرور می‌خواند
        await api.post(`/video-studio/projects/${created.id}/messages`, { content: text, imageKey })
        navigate(`/video/${created.id}`)
      } catch {
        setErrorMsg('ساخت پروژه ناموفق بود، دوباره امتحان کن')
      } finally {
        setIsStarting(false)
      }
      return
    }
    sendMessage.mutate(
      { content: text, imageKey },
      { onError: () => setErrorMsg('ارسال پیام ناموفق بود، دوباره امتحان کن') },
    )
  }

  async function handleRenderAll() {
    if (!project) return
    setRenderAllPending(true)
    try {
      const pending = project.shots.filter(s => s.videoStatus === 'NOT_STARTED')
      await Promise.all(pending.map(s => requestShotVideo.mutateAsync(s.id).catch(() => undefined)))
    } finally {
      setRenderAllPending(false)
    }
  }

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
          <span className="text-[17px] font-bold text-white">{project?.initialPrompt ? 'استودیوی ویدیو' : 'ساخت ویدیوی جدید'}</span>
        </div>
        <div className="flex items-center gap-2.5">
          {/* روی موبایل نوار سراسری خود ChatLayout همین نشان اعتبار را نشان می‌دهد — تکرارش
              اینجا فقط روی sm:+ (دقیقاً الگوی ImageStudioPage.tsx) */}
          <div className="hidden sm:contents">
            <PlanUpgradeBadge />
          </div>
          {/* دستور صریح کاربر: یک دکمه‌ی تنظیمات (نه چند چیپ پراکنده) — روی موبایل و دسکتاپ هر
              دو، همین یک دکمه مدال VideoStudioSettingsModal را باز می‌کند. فقط برای پروژه‌ی
              چت‌محور از‌قبل باز معنی دارد — صفحه‌ی ورودی SimpleVideoForm انتخاب مدل/سایز خودش را دارد */}
          {project && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex size-10 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(148,163,184,0.10)', border: '1px solid rgba(148,163,184,0.22)', color: '#cbd5e1' }}
              aria-label="تنظیمات مدل‌ها و ابعاد"
              title="تنظیمات"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}
          {project && (
            <button
              onClick={() => navigate('/video')}
              className="flex size-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/[0.06]"
              style={{ background: 'rgba(148,163,184,0.10)', border: '1px solid rgba(148,163,184,0.22)', color: '#cbd5e1' }}
              title="پروژه‌ی جدید"
              aria-label="شروع پروژه‌ی جدید"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setHistoryOpen(true)}
            className="flex size-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/[0.06]"
            style={{ background: 'rgba(148,163,184,0.10)', border: '1px solid rgba(148,163,184,0.22)', color: '#cbd5e1' }}
            title="تاریخچه‌ی استودیوی ویدیو"
            aria-label="باز کردن تاریخچه‌ی استودیوی ویدیو"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
            </svg>
          </button>
        </div>
      </div>

      <VideoStudioHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />

      {isLoading && (
        <div className="flex flex-1 items-center justify-center text-[13px] text-slate-500">در حال بارگذاری پروژه...</div>
      )}

      {!isLoading && !project && <SimpleVideoForm onCreated={pid => navigate(`/video/${pid}`)} />}

      {!isLoading && project && (
        <div className="relative flex flex-1 flex-col overflow-hidden sm:flex-row" style={{ padding: '20px 0' }}>
          {/* ── دسکتاپ: ستون چت (راست) — یک باکس بزرگ فول‌هایت ── */}
          <div className="hidden shrink-0 flex-col sm:order-1 sm:flex sm:w-[420px] sm:pr-10">
            <ChatPanel
              project={project}
              messages={messages ?? []}
              onSend={handleSend}
              sending={sendMessage.isPending || isStarting}
              errorMsg={errorMsg}
            />
          </div>

          {/* ── دسکتاپ: ستون گالری (چپ) ── */}
          <div className="order-1 hidden flex-1 flex-col overflow-y-auto px-5 pb-6 sm:order-2 sm:flex sm:px-10">
            <p className="mb-4 text-[13px]" style={{ color: '#64748b' }}>گالری این پروژه</p>

            <GalleryBody
              project={project}
              stage={stage}
              selectCharacter={selectCharacter}
              regenerateCharacters={regenerateCharacters}
              onOpenPlayer={(videoKey, previewImageKey) => setPlayer({ videoKey, previewImageKey })}
              onRenderAll={() => void handleRenderAll()}
              renderAllPending={renderAllPending}
            />
          </div>

          {/* ── موبایل: صفحه‌ی پایه = گالری + نوار نوشتن جمع‌شده ── */}
          <div className="flex flex-1 flex-col overflow-hidden sm:hidden">
            <div className="flex-1 overflow-y-auto px-4 pb-3">
              <GalleryBody
                project={project}
                stage={stage}
                selectCharacter={selectCharacter}
                regenerateCharacters={regenerateCharacters}
                onOpenPlayer={(videoKey, previewImageKey) => setPlayer({ videoKey, previewImageKey })}
                onRenderAll={() => void handleRenderAll()}
                renderAllPending={renderAllPending}
              />
            </div>
            <div className="shrink-0 px-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
              <button
                type="button"
                onClick={() => setMobileChatOpen(true)}
                className="flex w-full items-center gap-2.5 rounded-full py-2 pr-2 pl-4 text-right"
                style={{
                  background: 'linear-gradient(165deg, rgba(16,185,129,0.12) 0%, rgba(147,51,234,0.06) 100%)',
                  border: '1.5px solid rgba(16,185,129,0.34)',
                  boxShadow: '0 0 0 1px rgba(16,185,129,0.08), 0 16px 34px -18px rgba(16,185,129,0.45)',
                }}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                <span className="flex-1 truncate text-[13px]" style={{ color: '#94a3b8' }}>
                  {[...(messages ?? [])].reverse().find(m => m.role === 'assistant')?.content ?? 'بنویس چی می‌خوای بسازیم...'}
                </span>
              </button>
            </div>
          </div>

          <MobileChatModal
            open={mobileChatOpen}
            onClose={() => setMobileChatOpen(false)}
            project={project}
            messages={messages ?? []}
            onSend={(text, imageKey) => { void handleSend(text, imageKey) }}
            sending={sendMessage.isPending || isStarting}
            errorMsg={errorMsg}
          />
        </div>
      )}

      {player && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setPlayer(null)}
        >
          <div className="max-h-full max-w-full" onClick={e => e.stopPropagation()}>
            <StudioVideo videoKey={player.videoKey} previewImageKey={player.previewImageKey} className="max-h-[80vh] max-w-full rounded-2xl" />
          </div>
        </div>
      )}

      <VideoStudioSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        stage={stage}
        chatModels={chatModels}
        photoModels={photoModels}
        videoModels={videoModels}
        chatModelId={chatModelId}
        photoModelId={photoModelId}
        videoModelId={videoModelId}
        imageAspectRatio={imageAspectRatio}
        videoAspectRatio={videoAspectRatio}
        onSelectChatModel={v => updateModel('chatModelId', v)}
        onSelectPhotoModel={v => updateModel('photoModelId', v)}
        onSelectVideoModel={v => updateModel('videoModelId', v)}
        onSelectImageAspectRatio={v => updateModel('imageAspectRatio', v)}
        onSelectVideoAspectRatio={v => updateModel('videoAspectRatio', v)}
      />
    </div>
  )
}

function GalleryBody({
  project,
  stage,
  selectCharacter,
  regenerateCharacters,
  onOpenPlayer,
  onRenderAll,
  renderAllPending,
}: {
  project: StudioProject
  stage: VideoStudioStage
  selectCharacter: ReturnType<typeof useSelectCharacter>
  regenerateCharacters: ReturnType<typeof useRegenerateCharacters>
  onOpenPlayer: (key: string, previewImageKey: string | null) => void
  onRenderAll: () => void
  renderAllPending: boolean
}) {
  if (stage === 'empty') return <VideoStudioEmptyState />

  if (stage === 'character') {
    return (
      <div className="flex flex-col gap-4">
        <CharacterGrid
          options={project.characterOptions}
          selecting={selectCharacter.isPending}
          onSelect={optId => selectCharacter.mutate(optId)}
        />
        <SecondaryButton
          disabled={regenerateCharacters.isPending}
          onClick={() => regenerateCharacters.mutate()}
          className="self-start"
        >
          {regenerateCharacters.isPending ? 'در حال بازطراحی...' : 'بازطراحی کن'}
        </SecondaryButton>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ShotGrid projectId={project.id} shots={project.shots} stage={stage} onOpenPlayer={onOpenPlayer} />
      {stage === 'storyboard' && (
        <ActionButton disabled={renderAllPending} onClick={onRenderAll} className="self-start">
          {renderAllPending ? 'در حال ارسال...' : 'ساخت ویدیوی همه‌ی صحنه‌ها'}
        </ActionButton>
      )}
      {stage === 'result' && <ResultActionBar shots={project.shots} />}
    </div>
  )
}
