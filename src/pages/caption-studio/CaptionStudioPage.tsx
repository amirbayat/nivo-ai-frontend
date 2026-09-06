import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  captionAssetSrc,
  downloadCaptionSubtitle,
  downloadCaptionVideo,
  useCaptionProject,
  useCreateCaptionProject,
  useDiscardCaptionSource,
  useRetryCaptionTranscription,
  useStartCaptionRender,
  useUpdateCaptionProject,
} from '@/queries/captionStudio.queries'
import { useAuthedImageUrl } from '@/hooks/useAuthedImageUrl'
import type { CaptionProject, CaptionSegment, CaptionStyleOverrides, CaptionWord } from '@/types/api'

// docs/PRD-video-auto-captions.md §۵.۲/۵.۳ — ادیت متن/زمان‌بندی + بازیابی localStorage + جابجایی
// آزاد زیرنویس با درگ مستقیم روی ویدیو (موس/لمس) + پلیر سفارشی بیرون از قاب ویدیو + پنل‌های
// تمام‌صفحه‌ی موبایل، همه پیاده‌شده‌اند.
export function CaptionStudioPage() {
  const { id } = useParams<{ id?: string }>()
  return <CaptionStudioWorkspace key={id ?? 'new'} id={id} />
}

function CaptionStudioWorkspace({ id }: { id?: string }) {
  const navigate = useNavigate()
  const { data: project, isLoading } = useCaptionProject(id)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center px-5 pt-5 sm:px-10 sm:pt-7">
        <button
          type="button"
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
      </div>

      {/* بدنه‌ی زیر top-bar دیگر صفحه‌ی اسکرول‌شونده نیست — یک شِل با ارتفاع ثابت (مثل یک
          ادیتور واقعی) که خودش اسکرول نمی‌خورد؛ اسکرول فقط داخل نواحی مشخص (لیست زیرنویس‌ها،
          پنل استایل، شیت تمام‌صفحه‌ی موبایل) اتفاق می‌افتد */}
      <div className="flex flex-1 flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]">
        {!id && <CaptionUploadForm onCreated={pid => navigate(`/captions/${pid}`)} />}
        {id && (isLoading || !project) && <CenteredMessage text="در حال بارگذاری پروژه..." />}
        {id && project && <CaptionProjectView project={project} />}
      </div>
    </div>
  )
}

function CenteredMessage({ text }: { text: string }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-[13px]" style={{ color: '#64748b' }}>{text}</p>
    </div>
  )
}

function CaptionUploadForm({ onCreated }: { onCreated: (id: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const create = useCreateCaptionProject()

  async function handleFile(file: File) {
    setError(null)
    if (file.type !== 'video/mp4' && file.type !== 'video/quicktime') {
      setError('فقط فایل MP4 یا MOV پشتیبانی می‌شود')
      return
    }
    setProgress(0)
    try {
      const project = await create.mutateAsync({ file, onUploadProgress: setProgress })
      onCreated(project.id)
    } catch {
      setError('آپلود ناموفق بود، دوباره امتحان کن')
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-5 px-5 py-8 sm:px-0">
      <div className="text-center">
        <p className="text-[17px] font-bold text-white">استودیوی زیرنویس خودکار</p>
        <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: '#64748b' }}>
          ویدیوت رو آپلود کن، زیرنویس خودکار با استایل دلخواه بگیر
        </p>
      </div>

      <div
        className="flex flex-col items-center gap-4 rounded-[28px] p-8 text-center"
        style={{
          background:
            'linear-gradient(165deg, rgba(245,158,11,0.10) 0%, rgba(147,51,234,0.05) 55%, rgba(255,255,255,0.02) 100%)',
          border: '1.5px dashed rgba(245,158,11,0.35)',
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/quicktime"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
            e.target.value = ''
          }}
        />
        <p className="text-[14px] font-semibold text-slate-200">ویدیوی خود را انتخاب کنید</p>
        <p className="text-[12px]" style={{ color: '#64748b' }}>MP4، MOV — حداکثر ۲۰ دقیقه</p>
        {progress === null && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={create.isPending}
            className="mt-2 rounded-full px-6 py-3 text-[14px] font-bold text-[#241000] transition-opacity disabled:opacity-50"
            style={{ background: 'linear-gradient(90deg,#f59e0b,#fbbf24)' }}
          >
            انتخاب فایل
          </button>
        )}
        {progress !== null && (
          <div className="mt-2 flex w-full max-w-[220px] flex-col gap-1.5">
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#f59e0b,#fbbf24)' }}
              />
            </div>
            <span className="text-[11px] font-semibold" style={{ color: '#f59e0b' }}>
              در حال آپلود... {progress}٪
            </span>
          </div>
        )}
      </div>
      {error && <p className="text-center text-[12px] text-red-400">{error}</p>}
    </div>
  )
}

function CaptionProjectView({ project }: { project: CaptionProject }) {
  if (project.status === 'UPLOADED' || project.status === 'TRANSCRIBING') {
    return <ProcessingView label="در حال تشخیص گفتار..." />
  }
  if (project.status === 'RENDERING') {
    return <ProcessingView label="در حال رندر نهایی..." percent={project.renderProgress} />
  }
  if (project.status === 'FAILED') {
    return <FailedView projectId={project.id} />
  }
  return <CaptionEditor project={project} />
}

function ProcessingView({ label, percent }: { label: string; percent?: number }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      <svg className="size-6 animate-spin" viewBox="0 0 24 24" fill="none" style={{ color: '#f59e0b' }}>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      <p className="text-[13px] font-semibold text-slate-300">
        {label}
        {typeof percent === 'number' && percent > 0 ? ` ${percent}٪` : ''}
      </p>
      {typeof percent === 'number' && percent > 0 && (
        <div className="h-1.5 w-48 overflow-hidden rounded-full" style={{ background: 'rgba(148,163,184,0.18)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${percent}%`, background: '#f59e0b' }}
          />
        </div>
      )}
    </div>
  )
}

function FailedView({ projectId }: { projectId: string }) {
  const retry = useRetryCaptionTranscription(projectId)
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <p className="text-[13px] font-semibold text-red-400">پردازش این ویدیو ناموفق بود</p>
      <button
        type="button"
        onClick={() => retry.mutate()}
        disabled={retry.isPending}
        className="rounded-full px-6 py-2.5 text-[13px] font-bold text-[#241000] disabled:opacity-50"
        style={{ background: 'linear-gradient(90deg,#f59e0b,#fbbf24)' }}
      >
        {retry.isPending ? 'در حال تلاش دوباره...' : 'تلاش دوباره'}
      </button>
    </div>
  )
}

// دقیقاً هم‌الگوی buildDefaultSegments در ass-subtitle-builder.ts (وقتی کاربر هنوز
// segments ادیت‌شده‌ای نساخته) — wordsPerLine/linesPerCue حالا از StylePanel قابل‌تغییرند
function groupWordsIntoCues(words: CaptionWord[], wordsPerLine = 4, linesPerCue = 1): CaptionSegment[] {
  const perCue = Math.max(1, wordsPerLine) * Math.max(1, linesPerCue)
  const segments: CaptionSegment[] = []
  for (let i = 0; i < words.length; i += perCue) {
    const group = words.slice(i, i + perCue)
    if (group.length === 0) continue
    segments.push({
      id: `seg-${i}`,
      startMs: Math.round(group[0].start * 1000),
      endMs: Math.round(group[group.length - 1].end * 1000),
      text: group.map(w => w.word.trim()).join(' '),
      words: group,
    })
  }
  return segments
}

const DRAFT_KEY_PREFIX = 'caption-draft:'

// بخش ۵.۳ — safety-net لحظه‌ای، نه منبع اصلی داده: اگر رفرش اشتباهی رخ دهد و PATCH فرصت نکرده
// باشد به سرور برسد، این draft محلی همان کار ادیت‌شده را برمی‌گرداند
function loadDraft(
  projectId: string,
): { segments: CaptionSegment[]; styleOverrides: CaptionStyleOverrides; updatedAt: string } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY_PREFIX + projectId)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveDraft(projectId: string, segments: CaptionSegment[], styleOverrides: CaptionStyleOverrides) {
  try {
    localStorage.setItem(
      DRAFT_KEY_PREFIX + projectId,
      JSON.stringify({ segments, styleOverrides, updatedAt: new Date().toISOString() }),
    )
  } catch {
    // localStorage پر/غیرفعال — بی‌خیال safety-net می‌شویم، نه خطای بلوکه‌کننده
  }
}

function clearDraft(projectId: string) {
  try {
    localStorage.removeItem(DRAFT_KEY_PREFIX + projectId)
  } catch {
    // نادیده
  }
}

const DEFAULT_STYLE_OVERRIDES: CaptionStyleOverrides = {
  fontFamily: 'IRANYekanMsn',
  textColor: '#ffffff',
  highlightColor: '#10b981',
  backgroundMode: 'translucent',
  fontSizePx: 42,
  position: 'bottom',
  positionX: 0.5,
  positionY: 0.88,
  wordsPerLine: 4,
  linesPerCue: 1,
  styleId: 'default',
}

// ۴ پریست — هم‌راستا با STYLE_PRESETS در ass-subtitle-builder.ts (بک‌اند). انتخاب یک پریست
// این مقادیر را روی styleOverrides فعلی merge می‌کند؛ کاربر می‌تواند بعدش دستی override کند
const STYLE_PRESETS = [
  { id: 'default', label: 'پیش‌فرض', fontFamily: 'IRANYekanMsn', textColor: '#ffffff', highlightColor: '#10b981', backgroundMode: 'translucent' as const },
  { id: 'boldOutline', label: 'کاراکاپ پررنگ', fontFamily: 'IRANYekanMsn ExtraBold', textColor: '#ffffff', highlightColor: '#fbbf24', backgroundMode: 'none' as const },
  { id: 'neon', label: 'نئون', fontFamily: 'Vazirmatn', textColor: '#22d3ee', highlightColor: '#f472b6', backgroundMode: 'none' as const },
  { id: 'speakerBox', label: 'باکس گوینده', fontFamily: 'IRANYekanMsn', textColor: '#ffffff', highlightColor: '#fbbf24', backgroundMode: 'solid' as const },
]

type EditorTab = 'text' | 'style' | 'export'
const TAB_LABELS: Record<EditorTab, string> = { text: 'متن', style: 'استایل', export: 'خروجی' }

// فقط رزولوشن‌های ≤ ابعاد واقعی سورس مجازند (بدون آپ‌اسکیل جعلی) — بخش تصمیم محصولی پلن.
// height=undefined یعنی «کیفیت اصلی» (بدون اسکیل، رزولوشن سورس)
const RESOLUTION_OPTIONS: { label: string; height: number | undefined }[] = [
  { label: 'کیفیت اصلی', height: undefined },
  { label: 'HD', height: 720 },
  { label: 'Full HD', height: 1080 },
  { label: '4K', height: 2160 },
]

function TabIcon({ tab }: { tab: EditorTab }) {
  if (tab === 'text') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 12h10M4 18h7" />
      </svg>
    )
  }
  if (tab === 'style') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20l4-10 4 6 3-4 5 8H4z" /><circle cx="8" cy="7" r="2" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V3m0 12l-4-4m4 4l4-4M4 21h16" />
    </svg>
  )
}

function CaptionEditor({ project }: { project: CaptionProject }) {
  const isDone = project.status === 'DONE'
  const videoKey = isDone && project.renderedVideoKey ? project.renderedVideoKey : project.sourceVideoKey
  const videoUrl = useAuthedImageUrl(captionAssetSrc(videoKey))
  const startRender = useStartCaptionRender(project.id)
  const updateProject = useUpdateCaptionProject(project.id)
  const discardSource = useDiscardCaptionSource(project.id)
  const videoRef = useRef<HTMLVideoElement>(null)

  const initialStyle: CaptionStyleOverrides = { ...DEFAULT_STYLE_OVERRIDES, ...(project.styleOverrides ?? {}) }
  const [segments, setSegments] = useState<CaptionSegment[]>(
    () => project.segments ?? groupWordsIntoCues(project.transcriptWords ?? [], initialStyle.wordsPerLine, initialStyle.linesPerCue),
  )
  const [styleOverrides, setStyleOverrides] = useState<CaptionStyleOverrides>(() => initialStyle)
  const [tab, setTab] = useState<EditorTab>('text')
  const [mobileTab, setMobileTab] = useState<EditorTab | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [restoreOffer, setRestoreOffer] = useState<{ segments: CaptionSegment[]; styleOverrides: CaptionStyleOverrides } | null>(null)
  const [currentSec, setCurrentSec] = useState(0)
  const [targetHeight, setTargetHeight] = useState<number | undefined>(undefined)
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)
  const didInit = useRef(false)

  // برای هایلایت ردیف فعال در تب «متن»/تایم‌لاین و کلیک-برای-seek
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    function onTimeUpdate() {
      if (video) setCurrentSec(video.currentTime)
    }
    video.addEventListener('timeupdate', onTimeUpdate)
    return () => video.removeEventListener('timeupdate', onTimeUpdate)
  }, [videoUrl])

  function seekTo(seg: CaptionSegment) {
    if (videoRef.current) videoRef.current.currentTime = seg.startMs / 1000
  }

  // بازیابی draft محلی — فقط یک‌بار، لحظه‌ی اول باز شدن صفحه
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    const draft = loadDraft(project.id)
    if (draft && new Date(draft.updatedAt) > new Date(project.updatedAt)) {
      setRestoreOffer({ segments: draft.segments, styleOverrides: draft.styleOverrides })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // autosave: localStorage فوری + PATCH سرور با debounce ۲ثانیه‌ای (بخش ۵.۳)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    saveDraft(project.id, segments, styleOverrides)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      updateProject.mutate({ segments, styleOverrides }, { onSuccess: () => clearDraft(project.id) })
    }, 2000)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, styleOverrides])

  function applyRestore() {
    if (restoreOffer) {
      setSegments(restoreOffer.segments)
      setStyleOverrides(restoreOffer.styleOverrides)
    }
    setRestoreOffer(null)
  }

  // قبلاً دکمه‌ی رندر مستقیم startRender.mutate را صدا می‌زد، بدون صبر برای autosave
  // دیبانس‌شده (۲ ثانیه) — اگر کاربر بلافاصله بعد از ادیت متن روی «خروجی نهایی» می‌زد،
  // رندر با segments قدیمی (هنوز روی سرور ذخیره‌نشده) صف می‌شد. حالا قبل از رندر، تایمر
  // debounce را flush و منتظر تکمیل واقعی PATCH می‌مانیم تا مطمئن شویم رندر از روی
  // آخرین متن ادیت‌شده انجام می‌شود.
  async function handleRenderClick() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    try {
      await updateProject.mutateAsync({ segments, styleOverrides })
      clearDraft(project.id)
    } catch {
      window.alert('ذخیره‌ی آخرین ادیت‌ها با خطا مواجه شد؛ برای اطمینان از درستی رندر، دوباره تلاش کن.')
      return
    }
    startRender.mutate(targetHeight)
  }

  function updateSegment(updated: CaptionSegment) {
    setSegments(prev => prev.map(s => (s.id === updated.id ? updated : s)).sort((a, b) => a.startMs - b.startMs))
  }

  function deleteSegment(id: string) {
    setSegments(prev => prev.filter(s => s.id !== id))
  }

  // قبلاً از project.transcriptWords (متن خام اولیه‌ی ASR) رگروپ می‌شد، یعنی حذف/ادیت
  // دستی متن کاربر با هر تغییر «کلمه در هر خط» بی‌صدا پاک می‌شد. حالا از خودِ segments فعلی
  // (که segmentهای حذف‌شده‌ی کاربر را دیگر ندارد) رگروپ می‌کنیم، و اگر متنی دستی ادیت شده
  // باشد (که با تعداد کلمه‌ی جدید در هر خط قابل بازتوزیع نیست) قبلش تأیید می‌گیریم.
  function regenerateSegments(wordsPerLine: number, linesPerCue: number) {
    const hasTextEdits = segments.some(
      (s) => s.text.trim() !== s.words.map((w) => w.word.trim()).join(' ').trim(),
    )
    if (
      hasTextEdits &&
      !window.confirm('تغییر «کلمه در هر خط» متن‌هایی که دستی ادیت کرده‌اید را بازنویسی می‌کند. ادامه می‌دهید؟')
    ) {
      return
    }
    const words = segments.flatMap((s) => s.words)
    setStyleOverrides(prev => ({ ...prev, wordsPerLine, linesPerCue }))
    setSegments(groupWordsIntoCues(words, wordsPerLine, linesPerCue))
  }

  function applyPreset(preset: (typeof STYLE_PRESETS)[number]) {
    setStyleOverrides(prev => ({
      ...prev,
      styleId: preset.id,
      fontFamily: preset.fontFamily,
      textColor: preset.textColor,
      highlightColor: preset.highlightColor,
      backgroundMode: preset.backgroundMode,
    }))
  }

  async function handleDownloadVideo() {
    if (!project.renderedVideoKey) return
    setDownloadProgress(0)
    try {
      await downloadCaptionVideo(project.renderedVideoKey, setDownloadProgress)
    } finally {
      setDownloadProgress(null)
    }
  }

  // دانلود خودکار همین که رندر تمام شد — یک‌بار به‌ازای هر renderedVideoKey (نه هر بار که
  // کاربر دوباره صفحه‌ی همین پروژه‌ی تمام‌شده را باز می‌کند). کلید در localStorage نگه داشته
  // می‌شود چون CaptionEditor خودش با هر تغییر status دوباره mount می‌شود (ref کافی نیست).
  useEffect(() => {
    if (!isDone || !project.renderedVideoKey) return
    const storageKey = `caption-auto-dl-${project.id}`
    try {
      if (localStorage.getItem(storageKey) === project.renderedVideoKey) return
      localStorage.setItem(storageKey, project.renderedVideoKey)
    } catch {
      // localStorage غیرفعال — به‌جای بلوکه‌شدن، فقط از auto-download صرف‌نظر می‌کنیم
      return
    }
    handleDownloadVideo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone, project.renderedVideoKey])

  function handleDiscardSource() {
    if (!window.confirm('ویدیوی اصلی برای همیشه از سرور حذف می‌شود و دیگر امکان رندر دوباره نیست. مطمئنی؟')) return
    discardSource.mutate()
  }

  function openExportTab() {
    setTab('export')
    setMobileTab('export')
  }

  const editingSegment = segments.find(s => s.id === editingId) ?? null
  const availableResolutions = RESOLUTION_OPTIONS.filter(
    opt => opt.height === undefined || !project.sourceHeight || opt.height <= project.sourceHeight,
  )
  const sourceGone = !!project.sourceDeletedAt

  function renderTabContent(activeTab: EditorTab) {
    if (activeTab === 'text') {
      return <CueList segments={segments} currentSec={currentSec} onSeek={seekTo} onEdit={setEditingId} />
    }
    if (activeTab === 'style') {
      return (
        <StylePanel
          value={styleOverrides}
          onChange={setStyleOverrides}
          onWordsPerLineChange={n => regenerateSegments(n, styleOverrides.linesPerCue ?? 1)}
          onLinesPerCueChange={n => regenerateSegments(styleOverrides.wordsPerLine ?? 4, n)}
          onSelectPreset={applyPreset}
        />
      )
    }
    return (
      <ExportPanel
        projectId={project.id}
        isDone={isDone}
        sourceGone={sourceGone}
        availableResolutions={availableResolutions}
        targetHeight={targetHeight}
        onTargetHeightChange={setTargetHeight}
        onRender={handleRenderClick}
        renderPending={startRender.isPending || updateProject.isPending}
        renderError={startRender.isError}
        onDownloadVideo={handleDownloadVideo}
        downloadProgress={downloadProgress}
        onDiscardSource={handleDiscardSource}
        discardPending={discardSource.isPending}
      />
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-1 sm:px-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-[14px] font-bold text-white">
            {isDone ? 'ویدیوی زیرنویس‌دار آماده است' : 'ویرایشگر زیرنویس'}
          </span>
          {project.asrModelName && (
            <span className="text-[10.5px]" style={{ color: '#64748b' }}>مدل تشخیص گفتار: {project.asrModelName}</span>
          )}
        </div>
        <button
          type="button"
          onClick={openExportTab}
          className="flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold text-[#241000]"
          style={{ background: 'linear-gradient(90deg,#f59e0b,#fbbf24)' }}
        >
          <TabIcon tab="export" />
          خروجی
        </button>
      </div>

      {restoreOffer && (
        <div className="mx-4 mb-2 flex shrink-0 items-center justify-between gap-3 rounded-2xl px-4 py-3 sm:mx-6" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <span className="text-[12px] text-slate-200">یک نسخه‌ی ذخیره‌نشده از ادیت قبلی پیدا شد — بازیابی شود؟</span>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => setRestoreOffer(null)} className="text-[11.5px] font-semibold text-slate-400">رد کردن</button>
            <button type="button" onClick={applyRestore} className="rounded-full px-3 py-1.5 text-[11.5px] font-bold text-[#241000]" style={{ background: '#f59e0b' }}>بازیابی</button>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-4 sm:p-6">
          {!videoUrl && (
            <div className="flex flex-1 items-center justify-center rounded-2xl text-[12px]" style={{ color: '#64748b', background: 'rgba(255,255,255,0.02)' }}>
              در حال بارگذاری ویدیو...
            </div>
          )}
          {videoUrl && (
            <VideoStage
              videoRef={videoRef}
              videoUrl={videoUrl}
              segments={!isDone ? segments : undefined}
              styleOverrides={!isDone ? styleOverrides : undefined}
              onDragPosition={!isDone ? pos => setStyleOverrides(prev => ({ ...prev, positionX: pos.x, positionY: pos.y })) : undefined}
            />
          )}
          {videoUrl && <ControlBar videoRef={videoRef} />}
          {videoUrl && !isDone && <TimelineStrip segments={segments} currentSec={currentSec} onSeek={seekTo} />}
        </div>

        {/* دسکتاپ — پنل کناری همیشه inline (نه مدال) */}
        <div className="hidden shrink-0 flex-col gap-3 border-r p-4 sm:flex sm:w-[300px]" style={{ borderColor: 'rgba(148,163,184,0.16)' }}>
          <div className="flex shrink-0 items-center gap-1 rounded-full p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.18)' }}>
            {(['text', 'style', 'export'] as const).map(key => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className="flex-1 rounded-full py-2 text-[12px] font-bold transition-colors"
                style={tab === key ? { background: '#f59e0b', color: '#241000' } : { color: '#94a3b8' }}
              >
                {TAB_LABELS[key]}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">{renderTabContent(tab)}</div>
        </div>
      </div>

      {/* موبایل — تب پایین صفحه، هر کدوم یک شیت تمام‌صفحه باز می‌کند */}
      <div className="flex shrink-0 items-center justify-around border-t py-2 sm:hidden" style={{ borderColor: 'rgba(148,163,184,0.14)' }}>
        {(['text', 'style', 'export'] as const).map(key => (
          <button
            key={key}
            type="button"
            onClick={() => setMobileTab(key)}
            className="flex flex-col items-center gap-1 px-4 py-1"
            style={{ color: '#64748b' }}
          >
            <TabIcon tab={key} />
            <span className="text-[10.5px] font-bold">{TAB_LABELS[key]}</span>
          </button>
        ))}
      </div>

      {mobileTab && (
        <div className="fixed inset-0 z-40 flex flex-col sm:hidden" style={{ background: '#0b1120' }}>
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-3.5" style={{ borderColor: 'rgba(148,163,184,0.16)' }}>
            <span className="text-[13px] font-bold text-white">{TAB_LABELS[mobileTab]}</span>
            <button
              type="button"
              onClick={() => setMobileTab(null)}
              className="flex size-7 items-center justify-center rounded-full text-slate-400"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="11" height="11"><path d="M4 4l12 12M16 4L4 16" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{renderTabContent(mobileTab)}</div>
          <div className="shrink-0 p-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
            <button
              type="button"
              onClick={() => setMobileTab(null)}
              className="w-full rounded-full py-3 text-[13px] font-bold text-[#241000]"
              style={{ background: 'linear-gradient(90deg,#f59e0b,#fbbf24)' }}
            >
              اعمال
            </button>
          </div>
        </div>
      )}

      {editingSegment && (
        <TextEditModal
          segment={editingSegment}
          onSave={updateSegment}
          onDelete={() => deleteSegment(editingSegment.id)}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  )
}

function CueList({
  segments,
  currentSec,
  onSeek,
  onEdit,
}: {
  segments: CaptionSegment[]
  currentSec: number
  onSeek: (seg: CaptionSegment) => void
  onEdit: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {segments.map(seg => {
        const active = currentSec * 1000 >= seg.startMs && currentSec * 1000 <= seg.endMs
        return (
          <div
            key={seg.id}
            role="button"
            tabIndex={0}
            onClick={() => onSeek(seg)}
            onKeyDown={e => { if (e.key === 'Enter') onSeek(seg) }}
            className="flex cursor-pointer items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 text-right transition-colors"
            style={
              active
                ? { background: 'rgba(245,158,11,0.14)', border: '1px solid rgba(245,158,11,0.4)' }
                : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.16)' }
            }
          >
            <span className="flex flex-col gap-0.5">
              <span className="text-[9.5px]" style={{ color: active ? '#f59e0b' : '#64748b' }}>
                {(seg.startMs / 1000).toFixed(1)} - {(seg.endMs / 1000).toFixed(1)}
              </span>
              <span className="text-[12.5px] text-slate-200">{seg.text}</span>
            </span>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onEdit(seg.id) }}
              aria-label="ویرایش این زیرنویس"
              className="flex size-7 shrink-0 items-center justify-center rounded-full"
              style={{ color: '#64748b' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                <path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}

function TimelineStrip({
  segments,
  currentSec,
  onSeek,
}: {
  segments: CaptionSegment[]
  currentSec: number
  onSeek: (seg: CaptionSegment) => void
}) {
  return (
    <div className="flex shrink-0 gap-2 overflow-x-auto pb-1">
      {segments.map(seg => {
        const active = currentSec * 1000 >= seg.startMs && currentSec * 1000 <= seg.endMs
        return (
          <button
            key={seg.id}
            type="button"
            onClick={() => onSeek(seg)}
            className="shrink-0 rounded-xl px-3 py-2 text-right"
            style={
              active
                ? { minWidth: 110, border: '1.5px solid #10b981', background: 'rgba(16,185,129,0.10)' }
                : { minWidth: 90, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(30,41,59,0.5)' }
            }
          >
            <div className="text-[9px]" style={{ color: active ? '#34d399' : '#64748b' }}>
              {(seg.startMs / 1000).toFixed(1)} - {(seg.endMs / 1000).toFixed(1)}
            </div>
            <div className="truncate text-[11px] font-semibold" style={{ color: active ? '#fff' : '#94a3b8', maxWidth: 140 }}>
              {seg.text}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function formatPlayerTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// پلیر کاملاً سفارشی، بیرون از قاب ویدیو (نه رویش) — کنترل پیش‌فرض مرورگر روی <video> عمداً
// خاموش است (بدون attribute کنترل)؛ این تنها راه پخش/توقف/جابجایی زمان است
function ControlBar({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [scrubbing, setScrubbing] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    function onPlay() { setIsPlaying(true) }
    function onPause() { setIsPlaying(false) }
    function onTimeUpdate() { if (!scrubbing && video) setCurrentTime(video.currentTime) }
    function onLoadedMeta() { if (video) setDuration(video.duration || 0) }
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('loadedmetadata', onLoadedMeta)
    if (video.readyState >= 1) setDuration(video.duration || 0)
    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('loadedmetadata', onLoadedMeta)
    }
  }, [videoRef, scrubbing])

  function togglePlay() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) void video.play()
    else video.pause()
  }

  // نوار زمان راست‌به‌چپ پر می‌شود (هم‌جهت با بقیه‌ی UI که RTL است) — پیشرفت = فاصله از لبه‌ی راست
  function ratioFromPointer(e: React.PointerEvent<HTMLDivElement>): number {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return 0
    return Math.max(0, Math.min(1, (rect.right - e.clientX) / rect.width))
  }

  function seekToRatio(ratio: number) {
    setCurrentTime(ratio * duration)
    if (videoRef.current) videoRef.current.currentTime = ratio * duration
  }

  function handleScrubDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    setScrubbing(true)
    seekToRatio(ratioFromPointer(e))
  }
  function handleScrubMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!scrubbing) return
    seekToRatio(ratioFromPointer(e))
  }
  function handleScrubUp() {
    setScrubbing(false)
  }

  const progress = duration > 0 ? currentTime / duration : 0

  return (
    <div className="flex shrink-0 items-center gap-3 rounded-2xl px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.16)' }}>
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? 'توقف' : 'پخش'}
        className="flex size-8 shrink-0 items-center justify-center rounded-full"
        style={{ background: '#10b981', color: '#02170f' }}
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M7 5l12 7-12 7V5z" /></svg>
        )}
      </button>
      <div
        ref={trackRef}
        onPointerDown={handleScrubDown}
        onPointerMove={handleScrubMove}
        onPointerUp={handleScrubUp}
        className="relative flex-1 cursor-pointer"
        style={{ height: 22, touchAction: 'none' }}
      >
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full" style={{ height: 8, background: 'rgba(255,255,255,0.12)' }} />
        <div className="absolute top-1/2 -translate-y-1/2 rounded-full" style={{ height: 8, right: 0, width: `${progress * 100}%`, background: 'linear-gradient(90deg,#10b981,#34d399)' }} />
        <div className="absolute top-1/2 -translate-y-1/2 rounded-full" style={{ width: 16, height: 16, right: `calc(${progress * 100}% - 8px)`, background: '#fff', border: '3px solid #10b981' }} />
      </div>
      <span className="shrink-0 text-[11px] font-semibold" style={{ color: '#94a3b8' }}>
        {formatPlayerTime(currentTime)} / {formatPlayerTime(duration)}
      </span>
    </div>
  )
}

// طول‌ترین زیردنباله‌ی مشترک (LCS) بین کلمه‌های قدیم/جدید — جفت‌های (oldIdx,newIdx) کلمه‌هایی
// که عیناً یکی‌اند و ترتیبشان حفظ شده را برمی‌گرداند. اینها «لنگر»هایی می‌شوند که تایمینگ
// اصلی ASR‌شان دست‌نخورده می‌ماند؛ کلمه‌های بین دو لنگر (یا قبل از اولی/بعد از آخری) یعنی
// همان‌هایی که واقعاً کاربر عوض/اضافه/حذف کرده.
function lcsAlignIndices(oldWords: string[], newWords: string[]): Array<[number, number]> {
  const n = oldWords.length
  const m = newWords.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = oldWords[i] === newWords[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const pairs: Array<[number, number]> = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (oldWords[i] === newWords[j]) {
      pairs.push([i, j])
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++
    } else {
      j++
    }
  }
  return pairs
}

// هم پیش‌نمایش canvas (drawCue) هم رندر نهایی (ass-subtitle-builder.ts در بک‌اند) متن را از
// segment.words می‌خوانند، نه segment.text — قبلاً این مودال فقط .text را عوض می‌کرد و
// .words دست‌نخورده (با کلمه‌های قدیمی ASR) می‌ماند، یعنی نه پیش‌نمایش نه رندر نهایی اصلاً
// متوجه ادیت نمی‌شدند. این‌جا با LCS، کلمه‌هایی از متن جدید که عیناً در متن قدیم هم بوده‌اند
// (یعنی کاربر دست نزده) لنگر می‌شوند و تایمینگ دقیق ASR‌شان را نگه می‌دارند — فقط بازه‌ی
// کلمه‌هایی که واقعاً عوض/اضافه/حذف شده‌اند (بین دو لنگر، یا قبل از اولی/بعد از آخری) با
// تقسیم مساوی همان بازه تخمین زده می‌شود؛ نه کل segment. برای رایج‌ترین حالت (تصحیح یک کلمه،
// بدون تغییر تعداد) این عملاً همان بازه‌ی دقیق ASR همان کلمه را بازسازی می‌کند.
function remapWords(text: string, original: CaptionWord[], startMs: number, endMs: number): CaptionWord[] {
  const newWordsText = text.trim().split(/\s+/).filter(Boolean)
  const oldWordsText = original.map(w => w.word)
  const anchors = lcsAlignIndices(oldWordsText, newWordsText)
  const result: CaptionWord[] = new Array(newWordsText.length)
  for (const [oldIdx, newIdx] of anchors) {
    result[newIdx] = { ...original[oldIdx], word: newWordsText[newIdx] }
  }
  let prevEndSec = startMs / 1000
  for (let newIdx = 0; newIdx < newWordsText.length; ) {
    if (result[newIdx]) {
      prevEndSec = result[newIdx].end
      newIdx++
      continue
    }
    let runEnd = newIdx
    while (runEnd < newWordsText.length && !result[runEnd]) runEnd++
    const nextAnchorStartSec = runEnd < newWordsText.length ? result[runEnd].start : endMs / 1000
    const runLen = runEnd - newIdx
    const perWordSec = Math.max(0, nextAnchorStartSec - prevEndSec) / runLen
    for (let k = 0; k < runLen; k++) {
      result[newIdx + k] = {
        word: newWordsText[newIdx + k],
        start: prevEndSec + k * perWordSec,
        end: prevEndSec + (k + 1) * perWordSec,
        speaker: null,
      }
    }
    prevEndSec = nextAnchorStartSec
    newIdx = runEnd
  }
  return result
}

function TextEditModal({
  segment,
  onSave,
  onDelete,
  onClose,
}: {
  segment: CaptionSegment
  onSave: (updated: CaptionSegment) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [text, setText] = useState(segment.text)
  const [startSec, setStartSec] = useState(String((segment.startMs / 1000).toFixed(1)))
  const [endSec, setEndSec] = useState(String((segment.endMs / 1000).toFixed(1)))

  function handleSave() {
    const startMs = Math.round(Number(startSec) * 1000)
    const endMs = Math.round(Number(endSec) * 1000)
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs || !text.trim()) return
    const trimmed = text.trim()
    const words = remapWords(trimmed, segment.words, startMs, endMs)
    onSave({ ...segment, text: trimmed, startMs, endMs, words })
    onClose()
  }

  return (
    // مدال میان‌صفحه، نه bottom-sheet — یک sheet چسبیده به کف صفحه با کیبورد موبایل (که خودش
    // از پایین بالا می‌آید) تداخل پیدا می‌کند (docs/PRD-video-auto-captions.md §۵.۲)
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: 'rgba(2,6,23,0.72)' }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col gap-4 rounded-[26px] p-5"
        style={{ background: '#111c31', border: '1px solid rgba(148,163,184,0.16)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-bold text-white">ویرایش زیرنویس</span>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-full text-slate-400"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="11" height="11"><path d="M4 4l12 12M16 4L4 16" /></svg>
          </button>
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={2}
          className="w-full resize-none rounded-2xl bg-black/20 p-3 text-[14px] leading-relaxed text-slate-100"
          style={{ border: '1px solid rgba(148,163,184,0.25)' }}
        />

        <div className="flex items-center gap-3">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-[10.5px]" style={{ color: '#64748b' }}>
            شروع (ثانیه)
            <input
              type="number"
              step="0.1"
              value={startSec}
              onChange={e => setStartSec(e.target.value)}
              className="w-full min-w-0 rounded-xl bg-black/20 px-3 py-2 text-[13px] text-white"
              style={{ border: '1px solid rgba(148,163,184,0.2)' }}
            />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-[10.5px]" style={{ color: '#64748b' }}>
            پایان (ثانیه)
            <input
              type="number"
              step="0.1"
              value={endSec}
              onChange={e => setEndSec(e.target.value)}
              className="w-full min-w-0 rounded-xl bg-black/20 px-3 py-2 text-[13px] text-white"
              style={{ border: '1px solid rgba(148,163,184,0.2)' }}
            />
          </label>
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => { onDelete(); onClose() }}
            className="text-[12px] font-semibold text-red-400"
          >
            حذف این بخش
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="rounded-full px-5 py-2 text-[12px] font-semibold text-slate-400">لغو</button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full px-6 py-2 text-[12.5px] font-bold text-[#241000]"
              style={{ background: 'linear-gradient(90deg,#f59e0b,#fbbf24)' }}
            >
              ذخیره
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// باید دقیقاً هم‌راستا با ALLOWED_FONTS در ass-subtitle-builder.ts (بک‌اند) باشد — فونتی که
// اینجا نباشد رندر نهایی silently به پیش‌فرض برمی‌گردد
const FONT_OPTIONS = [
  { value: 'IRANYekanMsn', label: 'ایران‌یکان' },
  { value: 'IRANYekanMsn ExtraBold', label: 'ایران‌یکان اکسترابولد' },
  { value: 'Vazirmatn', label: 'وزیرمتن' },
  { value: 'Tahoma', label: 'Tahoma' },
]
const COLOR_OPTIONS = ['#ffffff', '#fbbf24', '#10b981', '#f472b6', '#60a5fa', '#22d3ee']
const BACKGROUND_OPTIONS = [
  ['none', 'هیچ'],
  ['translucent', 'نیمه‌شفاف'],
  ['solid', 'تخت'],
] as const
const POSITION_OPTIONS = [
  ['top', 'بالا'],
  ['center', 'وسط'],
  ['bottom', 'پایین'],
] as const
const WORDS_PER_LINE_OPTIONS = [1, 2, 3, 4, 5, 6, 8]
const LINES_PER_CUE_OPTIONS = [
  [1, 'یک خط'],
  [2, 'دو خط'],
] as const

function chipStyle(active: boolean): React.CSSProperties {
  return active
    ? { background: '#f59e0b', color: '#241000', border: 'none' }
    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.2)', color: '#94a3b8' }
}

// بخش ۵.۲/۸.۱ — این تنظیمات project-wide هستند (نه per-cue)، پس «اعمال به همه» عملاً تنها
// حالت است — سوییچ ساختگی اضافه نشد، فقط یک یادداشت شفاف‌کننده در پایین پنل
function StylePanel({
  value,
  onChange,
  onWordsPerLineChange,
  onLinesPerCueChange,
  onSelectPreset,
}: {
  value: CaptionStyleOverrides
  onChange: (v: CaptionStyleOverrides) => void
  onWordsPerLineChange: (n: number) => void
  onLinesPerCueChange: (n: number) => void
  onSelectPreset: (preset: (typeof STYLE_PRESETS)[number]) => void
}) {
  function set<K extends keyof CaptionStyleOverrides>(key: K, v: CaptionStyleOverrides[K]) {
    onChange({ ...value, [key]: v })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold" style={{ color: '#64748b' }}>قالب آماده</span>
        <div className="grid grid-cols-2 gap-1.5">
          {STYLE_PRESETS.map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className="flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5"
              style={
                value.styleId === preset.id
                  ? { background: 'rgba(245,158,11,0.14)', border: '1.5px solid #f59e0b' }
                  : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.16)' }
              }
            >
              <span className="text-[13px] font-bold" style={{ color: preset.highlightColor }}>Aa</span>
              <span className="text-[10.5px] font-semibold text-slate-300">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold" style={{ color: '#64748b' }}>فونت</span>
        <div className="flex flex-wrap gap-1.5">
          {FONT_OPTIONS.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => set('fontFamily', f.value)}
              className="rounded-full px-3 py-1.5 text-[11.5px] font-semibold"
              style={chipStyle(value.fontFamily === f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold" style={{ color: '#64748b' }}>رنگ متن</span>
        <div className="flex items-center gap-2">
          {COLOR_OPTIONS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => set('textColor', c)}
              className="size-6 rounded-full"
              style={{ background: c, border: value.textColor === c ? '2px solid #f59e0b' : '2px solid transparent' }}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold" style={{ color: '#64748b' }}>پس‌زمینه‌ی متن</span>
        <div className="flex gap-1.5">
          {BACKGROUND_OPTIONS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => set('backgroundMode', key)}
              className="flex-1 rounded-xl py-2 text-[11px] font-semibold"
              style={chipStyle(value.backgroundMode === key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold" style={{ color: '#64748b' }}>اندازه‌ی فونت</span>
          <span className="text-[11px] font-bold" style={{ color: '#f59e0b' }}>{value.fontSizePx}</span>
        </div>
        <input
          type="range"
          min={24}
          max={72}
          value={value.fontSizePx ?? 42}
          onChange={e => set('fontSizePx', Number(e.target.value))}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold" style={{ color: '#64748b' }}>کلمه در هر خط</span>
        <div className="flex flex-wrap gap-1.5">
          {WORDS_PER_LINE_OPTIONS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onWordsPerLineChange(n)}
              className="size-8 rounded-full text-[11.5px] font-bold"
              style={chipStyle((value.wordsPerLine ?? 4) === n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold" style={{ color: '#64748b' }}>تعداد خط هم‌زمان</span>
        <div className="flex gap-1.5">
          {LINES_PER_CUE_OPTIONS.map(([n, label]) => (
            <button
              key={n}
              type="button"
              onClick={() => onLinesPerCueChange(n)}
              className="flex-1 rounded-xl py-2 text-[11px] font-semibold"
              style={chipStyle((value.linesPerCue ?? 1) === n)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-[10px]" style={{ color: '#64748b' }}>تغییر این دو گزینه متن‌های ادیت‌شده‌ی فعلی را بازنویسی می‌کند</span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold" style={{ color: '#64748b' }}>موقعیت روی ویدیو</span>
        <div className="flex gap-1.5">
          {POSITION_OPTIONS.map(([key, label]) => {
            const presetY = key === 'top' ? 0.12 : key === 'center' ? 0.5 : 0.88
            const active = value.position === key && value.positionX === 0.5 && value.positionY === presetY
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange({ ...value, position: key, positionX: 0.5, positionY: presetY })}
                className="flex-1 rounded-xl py-2 text-[11px] font-semibold"
                style={chipStyle(active)}
              >
                {label}
              </button>
            )
          })}
        </div>
        <span className="text-[10px]" style={{ color: '#64748b' }}>یا مستقیم روی ویدیو زیرنویس رو بکش — هر جای ویدیو، هم با موس هم با انگشت</span>
      </div>

      <p className="text-[10px] leading-relaxed" style={{ color: '#64748b' }}>
        این تنظیمات روی همه‌ی زیرنویس‌های این ویدیو اعمال می‌شود
      </p>
    </div>
  )
}

function ExportPanel({
  projectId,
  isDone,
  sourceGone,
  availableResolutions,
  targetHeight,
  onTargetHeightChange,
  onRender,
  renderPending,
  renderError,
  onDownloadVideo,
  downloadProgress,
  onDiscardSource,
  discardPending,
}: {
  projectId: string
  isDone: boolean
  sourceGone: boolean
  availableResolutions: { label: string; height: number | undefined }[]
  targetHeight: number | undefined
  onTargetHeightChange: (h: number | undefined) => void
  onRender: () => void
  renderPending: boolean
  renderError: boolean
  onDownloadVideo: () => void
  downloadProgress: number | null
  onDiscardSource: () => void
  discardPending: boolean
}) {
  const [busy, setBusy] = useState<'srt' | 'vtt' | 'ass' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDownloadSubtitle(format: 'srt' | 'vtt' | 'ass') {
    setBusy(format)
    setError(null)
    try {
      await downloadCaptionSubtitle(projectId, format)
    } catch {
      setError('دانلود ناموفق بود')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold" style={{ color: '#64748b' }}>رزولوشن خروجی</span>
        <div className="flex flex-wrap gap-1.5">
          {availableResolutions.map(opt => (
            <button
              key={opt.label}
              type="button"
              onClick={() => onTargetHeightChange(opt.height)}
              disabled={sourceGone}
              className="rounded-full px-3.5 py-1.5 text-[11px] font-bold disabled:opacity-40"
              style={chipStyle(targetHeight === opt.height)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {!sourceGone && (
        <button
          type="button"
          onClick={onRender}
          disabled={renderPending}
          className="rounded-full py-3 text-[13.5px] font-bold text-[#241000] disabled:opacity-50"
          style={{ background: 'linear-gradient(90deg,#f59e0b,#fbbf24)' }}
        >
          {renderPending ? 'در حال شروع رندر...' : isDone ? 'رندر دوباره' : 'خروجی نهایی'}
        </button>
      )}
      {renderError && (
        <p className="text-[11.5px] text-red-400">شروع رندر ناموفق بود — اعتبار کافی نیست یا خطایی رخ داد</p>
      )}

      {isDone && (
        <button
          type="button"
          onClick={onDownloadVideo}
          disabled={downloadProgress !== null}
          className="rounded-full py-2.5 text-[12.5px] font-bold disabled:opacity-50"
          style={{ background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.35)', color: '#34d399' }}
        >
          {downloadProgress !== null ? `در حال دانلود... ${downloadProgress}٪` : 'دانلود ویدیوی نهایی'}
        </button>
      )}

      <div className="h-px" style={{ background: 'rgba(148,163,184,0.16)' }} />

      <div className="flex flex-col gap-2">
        <p className="text-[11.5px] leading-relaxed" style={{ color: '#94a3b8' }}>
          فایل زیرنویس خام — برای استفاده در ادیتورهای دیگر مثل Premiere یا CapCut
        </p>
        <div className="flex gap-2">
          {(['srt', 'vtt', 'ass'] as const).map(fmt => (
            <button
              key={fmt}
              type="button"
              onClick={() => void handleDownloadSubtitle(fmt)}
              disabled={busy === fmt}
              className="flex-1 rounded-full py-2.5 text-[12px] font-bold uppercase disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.2)', color: '#e2e8f0' }}
            >
              {busy === fmt ? '...' : fmt}
            </button>
          ))}
        </div>
        {error && <p className="text-[11px] text-red-400">{error}</p>}
      </div>

      {!sourceGone && (
        <button
          type="button"
          onClick={onDiscardSource}
          disabled={discardPending}
          className="text-[11px] font-semibold underline-offset-2 hover:underline disabled:opacity-50"
          style={{ color: '#64748b' }}
        >
          پایان کار و آزادسازی فضا (حذف ویدیوی اصلی)
        </button>
      )}
      {sourceGone && (
        <p className="text-[11px]" style={{ color: '#64748b' }}>
          ویدیوی اصلی حذف شده — رندر دوباره ممکن نیست
        </p>
      )}
    </div>
  )
}

// محاسبه‌ی مستطیل واقعی ویدیو داخل جعبه‌ی flex:1 — دقیقاً همون الگوریتم object-fit:contain
// (letterbox)، چون canvas/دستگیره‌ی درگ باید دقیقاً روی خودِ پیکسل‌های ویدیو بیفتند، نه کل
// جعبه (که معمولاً به‌خاطر نسبت تصویر متفاوت، حاشیه‌ی خالی هم دارد)
function computeContainRect(boxW: number, boxH: number, vidW: number, vidH: number) {
  if (!boxW || !boxH || !vidW || !vidH) return { left: 0, top: 0, width: boxW, height: boxH }
  const scale = Math.min(boxW / vidW, boxH / vidH)
  const width = vidW * scale
  const height = vidH * scale
  return { left: (boxW - width) / 2, top: (boxH - height) / 2, width, height }
}

// جعبه‌ی ویدیو — یک ناحیه‌ی flex:1 ثابت (نه چیزی که با محتوای پنل کناری بزرگ/کوچک شود)، با
// پس‌زمینه‌ی letterbox؛ ویدیو با object-fit:contain همیشه وسط و کامل دیده می‌شود. کنترل پیش‌فرض
// مرورگر عمداً خاموش است (ControlBar بیرون از این جعبه کنترل واقعی را می‌دهد). وقتی segments
// پاس داده شود (حالت ادیت، نه ویدیوی نهایی رندرشده)، پیش‌نمایش Canvas + دستگیره‌ی درگ آزاد
// (موس/لمس) هم روی همین جعبه می‌آید — دقیقاً هم‌ترازِ پیکسل‌های واقعی ویدیو، نه کل جعبه.
function VideoStage({
  videoRef,
  videoUrl,
  segments,
  styleOverrides,
  onDragPosition,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
  videoUrl: string
  segments?: CaptionSegment[]
  styleOverrides?: CaptionStyleOverrides
  onDragPosition?: (position: { x: number; y: number }) => void
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const editable = segments !== undefined && styleOverrides !== undefined && !!onDragPosition
  const [boxSize, setBoxSize] = useState({ width: 0, height: 0 })
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 })
  const [dragPreviewPos, setDragPreviewPos] = useState<{ x: number; y: number } | null>(null)
  const segmentsRef = useRef(segments)
  segmentsRef.current = segments
  const styleRef = useRef(styleOverrides)
  styleRef.current = styleOverrides
  const dragPreviewRef = useRef<{ x: number; y: number } | null>(null)
  dragPreviewRef.current = dragPreviewPos

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) setBoxSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    function onLoadedMeta() {
      if (video) setVideoSize({ width: video.videoWidth, height: video.videoHeight })
    }
    video.addEventListener('loadedmetadata', onLoadedMeta)
    if (video.readyState >= 1) onLoadedMeta()

    if (!editable) {
      return () => video.removeEventListener('loadedmetadata', onLoadedMeta)
    }

    let raf = 0
    function draw() {
      const canvas = canvasRef.current
      if (!video || !canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || canvas.width
        canvas.height = video.videoHeight || canvas.height
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const tMs = video.currentTime * 1000
      const list = segmentsRef.current ?? []
      const seg = list.find(s => tMs >= s.startMs && tMs <= s.endMs)
      if (seg && styleRef.current) {
        drawCue(ctx, canvas.width, canvas.height, seg, video.currentTime, styleRef.current, dragPreviewRef.current)
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMeta)
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable])

  const rect = computeContainRect(boxSize.width, boxSize.height, videoSize.width, videoSize.height)

  function ratioFromEvent(e: React.PointerEvent<HTMLDivElement>): { x: number; y: number } {
    const box = stageRef.current
    if (!box || rect.width === 0 || rect.height === 0) return { x: 0.5, y: 0.5 }
    const boxRect = box.getBoundingClientRect()
    const localX = e.clientX - boxRect.left - rect.left
    const localY = e.clientY - boxRect.top - rect.top
    return {
      x: Math.max(0.06, Math.min(0.94, localX / rect.width)),
      y: Math.max(0.06, Math.min(0.94, localY / rect.height)),
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragPreviewPos(ratioFromEvent(e))
  }
  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragPreviewRef.current === null) return
    setDragPreviewPos(ratioFromEvent(e))
  }
  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (dragPreviewRef.current === null) return
    onDragPosition?.(ratioFromEvent(e))
    setDragPreviewPos(null)
  }

  const { x: handleXRatio, y: handleYRatio } = editable && styleOverrides
    ? resolvePositionRatio(styleOverrides, dragPreviewPos)
    : { x: 0.5, y: 0.5 }
  const handleLeft = rect.left + handleXRatio * rect.width
  const handleTop = rect.top + handleYRatio * rect.height
  const handleBoxW = Math.max(60, rect.width * 0.5)
  const handleBoxH = Math.max(40, rect.height * 0.22)

  return (
    <div
      ref={stageRef}
      className="relative min-h-0 flex-1 overflow-hidden rounded-2xl"
      style={{
        background:
          'radial-gradient(circle at 15% -10%, rgba(52,211,153,0.20), transparent 55%), radial-gradient(circle at 100% 115%, rgba(99,102,241,0.16), transparent 55%), linear-gradient(150deg,#1e293b 0%,#0f1729 55%,#0b1020 100%)',
      }}
    >
      {/* بدون attribute کنترل — کنترل واقعی فقط از ControlBar بیرون از این جعبه است */}
      <video
        ref={videoRef}
        src={videoUrl}
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-contain"
      />
      {editable && (
        <>
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute"
            style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
          />
          {/* دستگیره‌ی درگ — مستقیم روی خودِ زیرنویس، هم با موس هم با لمس (touch-action:none
              جلوی تداخل با اسکرول صفحه‌ی موبایل موقع کشیدن را می‌گیرد) */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="absolute flex cursor-grab items-center justify-center active:cursor-grabbing"
            style={{
              left: handleLeft,
              top: handleTop,
              width: handleBoxW,
              height: handleBoxH,
              transform: 'translate(-50%, -50%)',
              touchAction: 'none',
            }}
            title="بکش تا موقعیت زیرنویس رو عوض کنی"
          />
        </>
      )}
    </div>
  )
}

function fontSizeFor(overrides: CaptionStyleOverrides, canvasHeight: number): number {
  // fontSizePx مقدار مطلق روی رزولوشن واقعی ویدیوست (مثل PlayResY در ASS، بخش ۵.۱) — چون
  // canvas.height همون رزولوشن واقعی ویدیوست (نه اندازه‌ی نمایشی)، مستقیم قابل‌استفاده است
  return overrides.fontSizePx ?? Math.round(canvasHeight * 0.045)
}

// هم‌راستا با resolvePositionRatio در ass-subtitle-builder.ts (بک‌اند) — جابجایی آزاد
// (positionX/Y) وقتی ست شده باشد اولویت دارد، وگرنه fallback سه‌حالت قدیمی
function resolvePositionRatio(
  style: CaptionStyleOverrides,
  dragPreview: { x: number; y: number } | null,
): { x: number; y: number } {
  if (dragPreview) return dragPreview
  const clamp = (v: number) => Math.min(0.94, Math.max(0.06, v))
  if (typeof style.positionX === 'number' && typeof style.positionY === 'number') {
    return { x: clamp(style.positionX), y: clamp(style.positionY) }
  }
  const y = style.position === 'top' ? 0.12 : style.position === 'center' ? 0.5 : 0.88
  return { x: 0.5, y }
}

// «IRANYekanMsn ExtraBold»/«Vazirmatn» به‌عنوان family مستقل توی CSS این پروژه ثبت نشده‌اند
// (فقط برای رندرر بک‌اند/libass معنا دارند) — برای پیش‌نمایش canvas به نزدیک‌ترین family
// واقعاً لود‌شده در مرورگر برمی‌گردیم تا حداقل گلیف فارسی درست نمایش داده شود
function canvasFontFamily(fontFamily: string | undefined): string {
  const base = fontFamily === 'IRANYekanMsn ExtraBold' || fontFamily === 'Vazirmatn' ? 'IRANYekanMsn' : fontFamily || 'IRANYekanMsn'
  return `${base}, IRANYekanMsn, Tahoma, sans-serif`
}

function drawCue(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  segment: CaptionSegment,
  currentTimeSec: number,
  style: CaptionStyleOverrides,
  dragPreviewPos: { x: number; y: number } | null,
) {
  const words = segment.words.length > 0 ? segment.words : [{ word: segment.text, start: segment.startMs / 1000, end: segment.endMs / 1000, speaker: null }]

  const fontSize = fontSizeFor(style, canvasHeight)
  ctx.font = `bold ${fontSize}px ${canvasFontFamily(style.fontFamily)}`
  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'alphabetic'

  // «تعداد کلمه در هر خط» / «تعداد خط» — همون منطق joinWordsForDisplay بک‌اند، فقط این‌جا
  // خط‌ها واقعاً روی canvas چیده می‌شوند (نه \N متنی)
  const wordsPerLine = Math.max(1, style.wordsPerLine ?? 4)
  const lines: (typeof words)[] = []
  for (let i = 0; i < words.length; i += wordsPerLine) lines.push(words.slice(i, i + wordsPerLine))

  const spaceWidth = ctx.measureText(' ').width
  const lineMetrics = lines.map(line => {
    const widths = line.map(w => ctx.measureText(w.word.trim()).width)
    const total = widths.reduce((a, b) => a + b, 0) + spaceWidth * (line.length - 1)
    return { widths, total }
  })
  const maxLineWidth = Math.max(...lineMetrics.map(l => l.total))
  const lineHeight = fontSize * 1.35
  const blockHeight = lines.length * lineHeight

  const { x: posXRatio, y: posYRatio } = resolvePositionRatio(style, dragPreviewPos)
  const centerX = posXRatio * canvasWidth
  const centerY = posYRatio * canvasHeight
  const firstBaselineY = centerY - blockHeight / 2 + lineHeight * 0.78
  const padding = fontSize * 0.6

  // پس‌زمینه‌ی نیمه‌شفاف پشت کل بلوک (همه‌ی خط‌ها) — یک جعبه‌ی پیوسته، نه جدا-جدا مثل رندر
  // فعلی ffmpeg (بخش ۵.۱ توضیح می‌دهد چرا ASS اینجا با canvas یکی نیست، فقط برای پیش‌نمایش)
  const backgroundMode = style.backgroundMode ?? 'translucent'
  if (backgroundMode !== 'none') {
    ctx.fillStyle = backgroundMode === 'solid' ? 'rgba(2,6,23,0.92)' : 'rgba(2,6,23,0.55)'
    roundRect(ctx, centerX - maxLineWidth / 2 - padding, centerY - blockHeight / 2 - padding * 0.4, maxLineWidth + padding * 2, blockHeight + padding * 0.8, 14)
    ctx.fill()
  }

  const textColor = style.textColor ?? '#ffffff'
  const highlightColor = style.highlightColor ?? '#10b981'
  lines.forEach((line, li) => {
    const baselineY = firstBaselineY + li * lineHeight
    let cursorX = centerX + lineMetrics[li].total / 2
    line.forEach((w, i) => {
      const active = currentTimeSec >= w.start && currentTimeSec <= w.end
      ctx.fillStyle = active ? highlightColor : textColor
      ctx.fillText(w.word.trim(), cursorX, baselineY)
      cursorX -= lineMetrics[li].widths[i] + spaceWidth
    })
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
