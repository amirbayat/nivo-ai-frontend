import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  captionAssetSrc,
  downloadCaptionSubtitle,
  useCaptionProject,
  useCreateCaptionProject,
  useRetryCaptionTranscription,
  useStartCaptionRender,
  useUpdateCaptionProject,
} from '@/queries/captionStudio.queries'
import { useAuthedImageUrl } from '@/hooks/useAuthedImageUrl'
import type { CaptionProject, CaptionSegment, CaptionStyleOverrides, CaptionWord } from '@/types/api'

// docs/PRD-video-auto-captions.md §۵.۲/۵.۳ — ادیت متن/زمان‌بندی + بازیابی localStorage اضافه
// شد؛ پنل استایل (فونت/رنگ/پس‌زمینه/موقعیت + اعمال به همه) و درگ/ریسایز مستقیم روی ویدیو
// هنوز فاز بعدی همین فیچرند.
export function CaptionStudioPage() {
  const { id } = useParams<{ id?: string }>()
  return <CaptionStudioWorkspace key={id ?? 'new'} id={id} />
}

function CaptionStudioWorkspace({ id }: { id?: string }) {
  const navigate = useNavigate()
  const { data: project, isLoading } = useCaptionProject(id)

  if (!id) {
    return <CaptionUploadForm onCreated={pid => navigate(`/captions/${pid}`)} />
  }
  if (isLoading || !project) {
    return <CenteredMessage text="در حال بارگذاری پروژه..." />
  }
  return <CaptionProjectView project={project} />
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
  const create = useCreateCaptionProject()

  async function handleFile(file: File) {
    setError(null)
    if (file.type !== 'video/mp4' && file.type !== 'video/quicktime') {
      setError('فقط فایل MP4 یا MOV پشتیبانی می‌شود')
      return
    }
    try {
      const project = await create.mutateAsync(file)
      onCreated(project.id)
    } catch {
      setError('آپلود ناموفق بود، دوباره امتحان کن')
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
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={create.isPending}
          className="mt-2 rounded-full px-6 py-3 text-[14px] font-bold text-[#241000] transition-opacity disabled:opacity-50"
          style={{ background: 'linear-gradient(90deg,#f59e0b,#fbbf24)' }}
        >
          {create.isPending ? 'در حال آپلود...' : 'انتخاب فایل'}
        </button>
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
    return <ProcessingView label="در حال رندر نهایی..." />
  }
  if (project.status === 'FAILED') {
    return <FailedView projectId={project.id} />
  }
  return <CaptionEditor project={project} />
}

function ProcessingView({ label }: { label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      <svg className="size-6 animate-spin" viewBox="0 0 24 24" fill="none" style={{ color: '#f59e0b' }}>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      <p className="text-[13px] font-semibold text-slate-300">{label}</p>
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

// هر ۴ کلمه یک cue — دقیقاً هم‌الگوی buildDefaultSegments در caption-render.processor.ts
// (وقتی کاربر هنوز segments ادیت‌شده‌ای نساخته)
const WORDS_PER_CUE = 4

function groupWordsIntoCues(words: CaptionWord[]): CaptionSegment[] {
  const segments: CaptionSegment[] = []
  for (let i = 0; i < words.length; i += WORDS_PER_CUE) {
    const group = words.slice(i, i + WORDS_PER_CUE)
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
}

type EditorTab = 'text' | 'style' | 'export'

function CaptionEditor({ project }: { project: CaptionProject }) {
  const isDone = project.status === 'DONE'
  const videoKey = isDone && project.renderedVideoKey ? project.renderedVideoKey : project.sourceVideoKey
  const videoUrl = useAuthedImageUrl(captionAssetSrc(videoKey))
  const startRender = useStartCaptionRender(project.id)
  const updateProject = useUpdateCaptionProject(project.id)

  const [segments, setSegments] = useState<CaptionSegment[]>(
    () => project.segments ?? groupWordsIntoCues(project.transcriptWords ?? []),
  )
  const [styleOverrides, setStyleOverrides] = useState<CaptionStyleOverrides>(
    () => ({ ...DEFAULT_STYLE_OVERRIDES, ...(project.styleOverrides ?? {}) }),
  )
  const [tab, setTab] = useState<EditorTab>('text')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [restoreOffer, setRestoreOffer] = useState<{ segments: CaptionSegment[]; styleOverrides: CaptionStyleOverrides } | null>(null)
  const didInit = useRef(false)

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

  function updateSegment(updated: CaptionSegment) {
    setSegments(prev => prev.map(s => (s.id === updated.id ? updated : s)).sort((a, b) => a.startMs - b.startMs))
  }

  function deleteSegment(id: string) {
    setSegments(prev => prev.filter(s => s.id !== id))
  }

  const editingSegment = segments.find(s => s.id === editingId) ?? null

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-5 py-6 sm:px-0">
      <div className="text-center">
        <p className="text-[15px] font-bold text-white">
          {isDone ? 'ویدیوی زیرنویس‌دار آماده است' : 'ویرایشگر زیرنویس'}
        </p>
        {project.asrModelName && (
          <p className="mt-1 text-[11px]" style={{ color: '#64748b' }}>مدل تشخیص گفتار: {project.asrModelName}</p>
        )}
      </div>

      {restoreOffer && (
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 rounded-2xl px-4 py-3" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <span className="text-[12px] text-slate-200">یک نسخه‌ی ذخیره‌نشده از ادیت قبلی پیدا شد — بازیابی شود؟</span>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => setRestoreOffer(null)} className="text-[11.5px] font-semibold text-slate-400">رد کردن</button>
            <button type="button" onClick={applyRestore} className="rounded-full px-3 py-1.5 text-[11.5px] font-bold text-[#241000]" style={{ background: '#f59e0b' }}>بازیابی</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl bg-black sm:mx-0">
          {!videoUrl && <div className="flex aspect-video items-center justify-center text-[12px] text-slate-500">در حال بارگذاری ویدیو...</div>}
          {videoUrl && !isDone && (
            <VideoWithCaptionOverlay
              videoUrl={videoUrl}
              segments={segments}
              styleOverrides={styleOverrides}
              onDragPosition={pos => setStyleOverrides(prev => ({ ...prev, position: pos }))}
            />
          )}
          {videoUrl && isDone && (
            // ویدیوی رندرشده از قبل زیرنویس سوزانده دارد (caption-render.processor.ts) —
            // نیازی به overlay Canvas نیست
            <video src={videoUrl} controls playsInline preload="metadata" className="w-full" />
          )}
        </div>

        {!isDone && (
          <div className="flex w-full flex-col gap-3 sm:w-[320px]">
            <div className="flex items-center gap-1 rounded-full p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.18)' }}>
              {([['text', 'متن'], ['style', 'استایل'], ['export', 'خروجی']] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className="flex-1 rounded-full py-2 text-[12px] font-bold transition-colors"
                  style={tab === key ? { background: '#f59e0b', color: '#241000' } : { color: '#94a3b8' }}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'text' && (
              <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto">
                {segments.map(seg => (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => setEditingId(seg.id)}
                    className="flex items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 text-right"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.16)' }}
                  >
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[9.5px]" style={{ color: '#64748b' }}>
                        {(seg.startMs / 1000).toFixed(1)} - {(seg.endMs / 1000).toFixed(1)}
                      </span>
                      <span className="text-[12.5px] text-slate-200">{seg.text}</span>
                    </span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" style={{ color: '#64748b', flexShrink: 0 }}>
                      <path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                  </button>
                ))}
              </div>
            )}

            {tab === 'style' && (
              <StylePanel value={styleOverrides} onChange={setStyleOverrides} />
            )}

            {tab === 'export' && <ExportPanel projectId={project.id} />}
          </div>
        )}
      </div>

      {!isDone && (
        <button
          type="button"
          onClick={() => startRender.mutate()}
          disabled={startRender.isPending}
          className="mx-auto rounded-full px-7 py-3 text-[14px] font-bold text-[#241000] disabled:opacity-50"
          style={{ background: 'linear-gradient(90deg,#f59e0b,#fbbf24)' }}
        >
          {startRender.isPending ? 'در حال شروع رندر...' : 'خروجی نهایی'}
        </button>
      )}
      {isDone && (
        <button
          type="button"
          onClick={() => startRender.mutate()}
          disabled={startRender.isPending}
          className="mx-auto rounded-full px-6 py-2.5 text-[12.5px] font-semibold text-slate-300"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(148,163,184,0.2)' }}
        >
          {startRender.isPending ? 'در حال رندر دوباره...' : 'رندر دوباره'}
        </button>
      )}
      {startRender.isError && (
        <p className="text-center text-[12px] text-red-400">شروع رندر ناموفق بود — اعتبار کافی نیست یا خطایی رخ داد</p>
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
    onSave({ ...segment, text: text.trim(), startMs, endMs })
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
          <label className="flex flex-1 flex-col gap-1 text-[10.5px]" style={{ color: '#64748b' }}>
            شروع (ثانیه)
            <input
              type="number"
              step="0.1"
              value={startSec}
              onChange={e => setStartSec(e.target.value)}
              className="rounded-xl bg-black/20 px-3 py-2 text-[13px] text-white"
              style={{ border: '1px solid rgba(148,163,184,0.2)' }}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-[10.5px]" style={{ color: '#64748b' }}>
            پایان (ثانیه)
            <input
              type="number"
              step="0.1"
              value={endSec}
              onChange={e => setEndSec(e.target.value)}
              className="rounded-xl bg-black/20 px-3 py-2 text-[13px] text-white"
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

const FONT_OPTIONS = [
  { value: 'IRANYekanMsn', label: 'ایران‌یکان' },
  { value: 'Tahoma', label: 'Tahoma' },
]
const COLOR_OPTIONS = ['#ffffff', '#fbbf24', '#10b981', '#f472b6', '#60a5fa']
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

function chipStyle(active: boolean): React.CSSProperties {
  return active
    ? { background: '#f59e0b', color: '#241000', border: 'none' }
    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.2)', color: '#94a3b8' }
}

// بخش ۵.۲/۸.۱ — این تنظیمات project-wide هستند (نه per-cue)، پس «اعمال به همه» عملاً تنها
// حالت است — سوییچ ساختگی اضافه نشد، فقط یک یادداشت شفاف‌کننده در پایین پنل
function StylePanel({ value, onChange }: { value: CaptionStyleOverrides; onChange: (v: CaptionStyleOverrides) => void }) {
  function set<K extends keyof CaptionStyleOverrides>(key: K, v: CaptionStyleOverrides[K]) {
    onChange({ ...value, [key]: v })
  }

  return (
    <div className="flex flex-col gap-4">
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
        <span className="text-[11px] font-bold" style={{ color: '#64748b' }}>موقعیت روی ویدیو</span>
        <div className="flex gap-1.5">
          {POSITION_OPTIONS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => set('position', key)}
              className="flex-1 rounded-xl py-2 text-[11px] font-semibold"
              style={chipStyle(value.position === key)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-[10px]" style={{ color: '#64748b' }}>یا مستقیم روی ویدیو زیرنویس رو بکش</span>
      </div>

      <p className="text-[10px] leading-relaxed" style={{ color: '#64748b' }}>
        این تنظیمات روی همه‌ی زیرنویس‌های این ویدیو اعمال می‌شود
      </p>
    </div>
  )
}

function ExportPanel({ projectId }: { projectId: string }) {
  const [busy, setBusy] = useState<'srt' | 'vtt' | 'ass' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload(format: 'srt' | 'vtt' | 'ass') {
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
    <div className="flex flex-col gap-3">
      <p className="text-[11.5px] leading-relaxed" style={{ color: '#94a3b8' }}>
        فایل زیرنویس خام — برای استفاده در ادیتورهای دیگر مثل Premiere یا CapCut
      </p>
      <div className="flex gap-2">
        {(['srt', 'vtt', 'ass'] as const).map(fmt => (
          <button
            key={fmt}
            type="button"
            onClick={() => void handleDownload(fmt)}
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
  )
}

// پیش‌نمایش زنده‌ی زیرنویس با Canvas — بخش ۵.۲: فرانت فقط با آرایه‌ی کلمات کار می‌کند، نه
// پیکسل؛ رسم مستقیم روی canvas یعنی هیچ transcoding واقعی سمت کلاینت لازم نیست. segments
// همان چیزی است که کاربر ادیت می‌کند — پیش‌نمایش بلافاصله بعد از هر ادیت به‌روز می‌شود.
//
// درگ روی خودِ زیرنویس: چون schema/رندر بک‌اند فقط ۳ موقعیت گسسته (بالا/وسط/پایین) پشتیبانی
// می‌کند (نه مختصات پیوسته)، درگ به نزدیک‌ترین یک‌سوم صفحه «اسنپ» می‌شود — تجربه‌ی کشیدن واقعی،
// خروجی همیشه چیزی که بک‌اند واقعاً می‌تواند بسوزاند (بخش ۵.۲).
function VideoWithCaptionOverlay({
  videoUrl,
  segments,
  styleOverrides,
  onDragPosition,
}: {
  videoUrl: string
  segments: CaptionSegment[]
  styleOverrides: CaptionStyleOverrides
  onDragPosition: (position: 'top' | 'center' | 'bottom') => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [aspect, setAspect] = useState<number | null>(null)
  const [dragPreviewY, setDragPreviewY] = useState<number | null>(null)
  const segmentsRef = useRef(segments)
  segmentsRef.current = segments
  const styleRef = useRef(styleOverrides)
  styleRef.current = styleOverrides
  const dragPreviewRef = useRef<number | null>(null)
  dragPreviewRef.current = dragPreviewY

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    let raf = 0
    function draw() {
      if (!video || !canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || canvas.width
        canvas.height = video.videoHeight || canvas.height
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const tMs = video.currentTime * 1000
      const seg = segmentsRef.current.find(s => tMs >= s.startMs && tMs <= s.endMs) ?? segmentsRef.current[0]
      if (seg) {
        drawCue(ctx, canvas.width, canvas.height, seg, video.currentTime, styleRef.current, dragPreviewRef.current)
      }

      raf = requestAnimationFrame(draw)
    }

    function onLoadedMeta() {
      if (!video) return
      if (video.videoWidth && video.videoHeight) setAspect(video.videoWidth / video.videoHeight)
      raf = requestAnimationFrame(draw)
    }

    video.addEventListener('loadedmetadata', onLoadedMeta)
    if (video.readyState >= 1) onLoadedMeta()

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMeta)
      cancelAnimationFrame(raf)
    }
  }, [])

  function positionFromRatio(ratio: number): 'top' | 'center' | 'bottom' {
    if (ratio < 1 / 3) return 'top'
    if (ratio < 2 / 3) return 'center'
    return 'bottom'
  }

  function ratioFromEvent(e: React.PointerEvent<HTMLDivElement>): number {
    // مختصات نسبت به کل ویدیو محاسبه می‌شود (نه فقط دستگیره) تا درگ به بالا/پایین واقعاً جواب بدهد
    const container = e.currentTarget.parentElement as HTMLElement
    const rect = container.getBoundingClientRect()
    return Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragPreviewY(ratioFromEvent(e))
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragPreviewRef.current === null) return
    setDragPreviewY(ratioFromEvent(e))
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (dragPreviewRef.current === null) return
    onDragPosition(positionFromRatio(ratioFromEvent(e)))
    setDragPreviewY(null)
  }

  // فقط یک نوار باریک دور محل فعلی زیرنویس قابل‌درگ است — بقیه‌ی ویدیو (از جمله کنترل‌های
  // پخش native) باید کلیک‌پذیر بماند، پس خودِ canvas عمداً pointer-events-none است
  const handleTop = styleOverrides.position === 'top' ? '6%' : styleOverrides.position === 'center' ? '40%' : '74%'

  return (
    <div className="relative w-full" style={{ aspectRatio: aspect ?? 16 / 9 }}>
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full"
      />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="absolute inset-x-0 flex cursor-grab items-center justify-center active:cursor-grabbing"
        style={{ top: handleTop, height: '20%' }}
        title="بکش تا موقعیت زیرنویس رو عوض کنی"
      />
    </div>
  )
}

function fontSizeFor(overrides: CaptionStyleOverrides, canvasHeight: number): number {
  // fontSizePx مقدار مطلق روی رزولوشن واقعی ویدیوست (مثل PlayResY در ASS، بخش ۵.۱) — چون
  // canvas.height همون رزولوشن واقعی ویدیوست (نه اندازه‌ی نمایشی)، مستقیم قابل‌استفاده است
  return overrides.fontSizePx ?? Math.round(canvasHeight * 0.045)
}

function baselineYFor(position: CaptionStyleOverrides['position'], canvasHeight: number, dragPreviewRatio: number | null): number {
  if (dragPreviewRatio !== null) return canvasHeight * dragPreviewRatio
  if (position === 'top') return canvasHeight * 0.16
  if (position === 'center') return canvasHeight * 0.5
  return canvasHeight * 0.88
}

function drawCue(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  segment: CaptionSegment,
  currentTimeSec: number,
  style: CaptionStyleOverrides,
  dragPreviewRatio: number | null,
) {
  const words = segment.words.length > 0 ? segment.words : [{ word: segment.text, start: segment.startMs / 1000, end: segment.endMs / 1000, speaker: null }]

  const fontSize = fontSizeFor(style, canvasHeight)
  const fontFamily = style.fontFamily ?? 'IRANYekanMsn'
  ctx.font = `bold ${fontSize}px ${fontFamily}, Tahoma, sans-serif`
  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'alphabetic'

  const spaceWidth = ctx.measureText(' ').width
  const widths = words.map(w => ctx.measureText(w.word).width)
  const totalWidth = widths.reduce((a, b) => a + b, 0) + spaceWidth * (words.length - 1)

  const centerX = canvasWidth / 2
  const baselineY = baselineYFor(style.position, canvasHeight, dragPreviewRatio)
  const padding = fontSize * 0.6

  // پس‌زمینه‌ی نیمه‌شفاف پشت کل خط (یک جعبه‌ی پیوسته، نه جدا-جدا مثل رندر فعلی ffmpeg —
  // بخش ۵.۱ توضیح می‌دهد چرا ASS اینجا با canvas یکی نیست، فقط برای پیش‌نمایش)
  const backgroundMode = style.backgroundMode ?? 'translucent'
  if (backgroundMode !== 'none') {
    ctx.fillStyle = backgroundMode === 'solid' ? 'rgba(2,6,23,0.92)' : 'rgba(2,6,23,0.55)'
    const boxHeight = fontSize * 1.6
    roundRect(ctx, centerX - totalWidth / 2 - padding, baselineY - fontSize * 1.05, totalWidth + padding * 2, boxHeight, 14)
    ctx.fill()
  }

  const textColor = style.textColor ?? '#ffffff'
  const highlightColor = style.highlightColor ?? '#10b981'
  let cursorX = centerX + totalWidth / 2
  words.forEach((w, i) => {
    const active = currentTimeSec >= w.start && currentTimeSec <= w.end
    ctx.fillStyle = active ? highlightColor : textColor
    ctx.fillText(w.word, cursorX, baselineY)
    cursorX -= widths[i] + spaceWidth
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
