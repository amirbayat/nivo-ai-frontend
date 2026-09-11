import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useKieVideoModels, useVideoEditSessions } from '@/queries/videoEdit.queries'
import { useCreditsBalance } from '@/queries/credits.queries'
import { VideoEditForm } from './VideoEditForms'
import { VideoStudioForm } from './VideoStudioForm'
import { VideoEditGallery } from './VideoEditGallery'
import { VideoEditModelPickerModal } from './VideoEditModelPickerModal'
import type { KieVideoModel, VideoEditMode, VideoEditJob } from '@/types/api'

// بازطراحی ۱۴۰۵/۰۶/۱۷ (طبق آرتیفکت جدید) — دیگر دو تب «تولید»/«ادیت» جدا نیست؛ یک فرم واحد
// (VideoEditForm) که toggle مرجع/ادیت درون خودش دارد. تغییرات اصلی نسبت به قبل:
//  ۱) انتخابگر مدل حالا همون مدال مشترک (ModelPickerModal) است که تولید عکس/ویدیو استفاده
//     می‌کنند (دستور کاربر: نه دراپ‌دون کوچک) — یک چیپ که کلیک‌کردنش مدال باز می‌کند. provider
//     (Kie/OpenRouter) عمداً به کاربر نشان داده نمی‌شود — یک جزئیات پیاده‌سازی داخلی است.
//  ۲) مفهوم تازه‌ی «Session»: هر بار «شروع جدید» یعنی یک session تازه؛ گالری فقط کارهای همون
//     session فعال را نشان می‌دهد (نه کل تاریخچه‌ی کاربر)، و یک drawer برای سوییچ بین جلسات هست.
function ModelTriggerChip({ model, onOpen }: { model: KieVideoModel | undefined; onOpen: () => void }) {
  if (!model) return null
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center justify-between gap-2.5 rounded-2xl px-3.5 py-3 text-right"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.20)' }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(16,185,129,0.14)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#6ee7b7"><path d="M12 2l1.8 5.6L19 9l-5.2 1.4L12 16l-1.8-5.6L5 9l5.2-1.4L12 2z" /></svg>
        </span>
        <span className="truncate text-[13.5px] font-bold text-white">{model.displayName}</span>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2"><polyline points="6 9 12 15 18 9" /></svg>
    </button>
  )
}

function SessionHistoryDrawer({
  open,
  onClose,
  sessions,
  activeSessionId,
  onPick,
  onStartNew,
}: {
  open: boolean
  onClose: () => void
  sessions: { id: string; title: string | null; createdAt: string; jobs: unknown[] }[]
  activeSessionId: string | undefined
  onPick: (id: string) => void
  onStartNew: () => void
}) {
  return (
    <div className={clsx('absolute inset-0 z-[60]', !open && 'pointer-events-none')}>
      <div
        onClick={onClose}
        className={clsx('absolute inset-0 bg-black/60 transition-opacity', open ? 'opacity-100' : 'opacity-0')}
      />
      <div
        className={clsx(
          'absolute inset-y-0 left-0 flex w-[340px] max-w-[85vw] flex-col overflow-hidden transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ background: '#080f1e', borderRight: '1px solid rgba(148,163,184,0.16)' }}
      >
        <div className="flex shrink-0 items-center justify-between border-b px-4 pb-3.5 pt-5" style={{ borderColor: 'rgba(148,163,184,0.12)' }}>
          <span className="text-[14px] font-bold text-white">تاریخچه‌ی ویرایش ویدیو</span>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-full text-slate-300"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(148,163,184,0.24)' }}
            aria-label="بستن"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="shrink-0 p-3.5 pb-1">
          <button
            type="button"
            onClick={onStartNew}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[12.5px] font-bold"
            style={{ background: 'rgba(16,185,129,0.10)', border: '1.5px dashed rgba(16,185,129,0.35)', color: '#6ee7b7' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            شروع ویرایش جدید
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2.5">
          {sessions.map(s => {
            const active = s.id === activeSessionId
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onPick(s.id)}
                className="flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-right"
                style={{ background: active ? 'rgba(16,185,129,0.08)' : 'transparent' }}
              >
                <span className="flex min-w-0 flex-col items-start">
                  <span className="truncate text-[12.5px] font-semibold" style={{ color: active ? '#d1fae5' : '#e2e8f0', maxWidth: 220 }}>
                    {s.title ?? 'بدون عنوان'}
                  </span>
                  <span className="mt-0.5 text-[10.5px]" style={{ color: '#64748b' }}>
                    {new Date(s.createdAt).toLocaleDateString('fa-IR')}
                  </span>
                </span>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: 'rgba(56,189,248,0.14)', color: '#7dd3fc' }}
                >
                  {s.jobs.length} کار
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function VideoStudioPage() {
  const navigate = useNavigate()
  const { data: models } = useKieVideoModels()
  const { data: sessions } = useVideoEditSessions()
  const { data: balance } = useCreditsBalance()
  const [mobileFormOpen, setMobileFormOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [modelPickerOpen, setModelPickerOpen] = useState(false)
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined)
  // undefined = «جلسه‌ی تازه» (هنوز در دیتابیس ساخته نشده — سرور اولین job را که بسازیم می‌سازدش)
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(undefined)
  // فوراً (قبل از هر آپلود/درخواست شبکه) پر می‌شود تا یه کارت «در حال پردازش» بلافاصله توی
  // گالری دیده بشه — دقیقاً همون الگوی ImageStudioPage.tsx (creatingSubmitting/isPending
  // به‌عنوان اولین آیتم گرید)، نه صبر برای رفت‌وبرگشت شبکه + رفرش session
  const [pendingSubmit, setPendingSubmit] = useState<{ prompt: string; mode: VideoEditMode } | null>(null)
  const createdSessionRef = useRef<string | null>(null)

  const model = models?.find(m => m.id === selectedModelId) ?? models?.[0]
  const activeSession = sessions?.find(s => s.id === activeSessionId)
  const activeJobs: VideoEditJob[] = pendingSubmit
    ? [
        {
          id: '__pending__',
          userId: '',
          sessionId: activeSessionId ?? '',
          kieVideoModelId: model?.id ?? '',
          mode: pendingSubmit.mode,
          prompt: pendingSubmit.prompt,
          referenceImageKeys: [],
          videoKey: null,
          videoWindowStartSec: null,
          videoWindowEndSec: null,
          aspectRatio: null,
          resolution: '',
          status: 'PROCESSING',
          kieTaskId: null,
          resultVideoKey: null,
          errorMessage: null,
          creditsConsumedRaw: null,
          creditCost: null,
          valuesJson: null,
          kieState: null,
          progressPercent: null,
          createdAt: new Date().toISOString(),
          completedAt: null,
        },
        ...(activeSession?.jobs ?? []),
      ]
    : (activeSession?.jobs ?? [])

  // اگه session فعال از لیست حذف/عوض شده باشه (مثلاً رفرش صفحه با یک session قدیمی که دیگه
  // معتبر نیست)، برنگرد به یه چیز نامعتبر — بذار همون «جلسه‌ی تازه» بمونه
  useEffect(() => {
    if (!activeSessionId || !sessions) return
    if (sessions.some(s => s.id === activeSessionId)) return
    if (createdSessionRef.current === activeSessionId) return
    setActiveSessionId(undefined)
  }, [sessions, activeSessionId])

  useEffect(() => {
    if (!pendingSubmit) return
    const hasRealJob = activeSession?.jobs.some(j => j.id !== '__pending__')
    if (hasRealJob) setPendingSubmit(null)
  }, [activeSession, pendingSubmit])

  const formPanel = (
    <div className="flex flex-1 flex-col overflow-y-auto px-1 pb-6">
      <div className="px-1 pb-1 pt-0.5">
        <p className="text-[12px] font-bold" style={{ color: '#34d399' }}>{model?.displayName ?? '...'}</p>
        <h1 className="mt-1.5 text-[16.5px] font-extrabold text-white" style={{ textWrap: 'balance' }}>
          از پرامپت، عکس یا ویدیو یه ویدیوی تازه بساز یا خودش رو ویرایش کن
        </h1>
      </div>

      {models && models.length > 1 && (
        <div className="mt-3.5">
          <ModelTriggerChip model={model} onOpen={() => setModelPickerOpen(true)} />
        </div>
      )}

      <div className="mt-3.5">
        {!model ? (
          <p className="px-1 py-8 text-center text-[13px]" style={{ color: '#64748b' }}>در حال بارگذاری مدل‌ها...</p>
        ) : model.inputFields ? (
          <VideoStudioForm
            model={model}
            sessionId={activeSessionId}
            onSubmitStart={info => setPendingSubmit(info)}
            onSubmitEnd={() => setPendingSubmit(null)}
            onCreated={job => {
              createdSessionRef.current = job.sessionId
              setActiveSessionId(job.sessionId)
              setMobileFormOpen(false)
            }}
          />
        ) : (
          <VideoEditForm
            model={model}
            sessionId={activeSessionId}
            onSubmitStart={info => setPendingSubmit(info)}
            onSubmitEnd={() => setPendingSubmit(null)}
            onCreated={job => {
              createdSessionRef.current = job.sessionId
              setActiveSessionId(job.sessionId)
              setMobileFormOpen(false)
            }}
          />
        )}
      </div>
    </div>
  )

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden" style={{ background: '#020C18' }} dir="rtl">
      <div className="flex shrink-0 items-center justify-between px-5 pt-5 sm:px-10 sm:pt-7">
        <div className="flex min-w-0 items-center gap-3.5">
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
          <div className="flex min-w-0 flex-col">
            <span className="text-[11px] font-bold" style={{ color: '#64748b' }}>ویرایش ویدیو</span>
            <span className="truncate text-[16px] font-bold text-white" style={{ maxWidth: 260 }}>
              {activeSession?.title ?? 'جلسه‌ی تازه'}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          {balance && (
            <div className="hidden items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] sm:flex" style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.30)' }}>
              <span style={{ color: '#94a3b8' }}>اعتبار شما:</span>
              <span className="font-bold" style={{ color: '#6ee7b7' }}>{balance.credits.toLocaleString('fa-IR')}</span>
              <span style={{ color: '#94a3b8' }}>نیوو</span>
            </div>
          )}
          <button
            onClick={() => setHistoryOpen(true)}
            title="تاریخچه‌ی جلسه‌ها"
            className="flex size-9 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(148,163,184,0.24)', color: '#cbd5e1' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" /></svg>
          </button>
          <button
            onClick={() => {
              createdSessionRef.current = null
              setActiveSessionId(undefined)
              setPendingSubmit(null)
            }}
            title="ویرایش جدید"
            className="flex size-9 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.32)', color: '#6ee7b7' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col overflow-hidden sm:flex-row" style={{ padding: '20px 0' }}>
        {/* ── دسکتاپ: پنل فرم (راست) ── */}
        <div className="hidden shrink-0 flex-col sm:order-1 sm:flex sm:w-[400px] sm:pr-10">
          {formPanel}
        </div>

        {/* ── دسکتاپ: پنل گالری (چپ) ── */}
        <div className="order-1 hidden flex-1 flex-col overflow-y-auto px-5 pb-6 sm:order-2 sm:flex sm:px-10">
          <p className="mb-4 text-[13px]" style={{ color: '#64748b' }}>کارهای این جلسه</p>
          <VideoEditGallery jobs={activeJobs} />
        </div>

        {/* ── موبایل: صفحه‌ی پایه = گالری + نوار جمع‌شده ── */}
        <div className="flex flex-1 flex-col overflow-hidden sm:hidden">
          <div className="flex-1 overflow-y-auto px-4 pb-3">
            <VideoEditGallery jobs={activeJobs} />
          </div>
          <div className="shrink-0 px-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
            <button
              type="button"
              onClick={() => setMobileFormOpen(true)}
              className="flex w-full items-center gap-2.5 rounded-full py-2 pr-2 pl-4 text-right"
              style={{
                background: 'linear-gradient(165deg, rgba(16,185,129,0.12) 0%, rgba(147,51,234,0.06) 100%)',
                border: '1.5px solid rgba(16,185,129,0.34)',
                boxShadow: '0 0 0 1px rgba(16,185,129,0.08), 0 16px 34px -18px rgba(16,185,129,0.45)',
              }}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <span className="flex-1 truncate text-[13px]" style={{ color: '#94a3b8' }}>ویدیوی جدید — تولید یا ادیت</span>
            </button>
          </div>
        </div>

        {/* ── موبایل: مدال تمام‌صفحه‌ی فرم (اسلاید از پایین) — الگوی MobileChatModal ── */}
        <div
          className={clsx(
            'absolute inset-0 z-[25] flex flex-col overflow-hidden bg-[#020C18] transition-[transform,opacity] duration-300 ease-out sm:hidden',
            mobileFormOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0',
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-700/50 px-4 pb-3" style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
            <span className="text-[14.5px] font-bold text-white">تولید یا ادیت ویدیو</span>
            <button
              type="button"
              onClick={() => setMobileFormOpen(false)}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-300"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(148,163,184,0.24)' }}
              aria-label="بستن"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4">{formPanel}</div>
        </div>
      </div>

      <SessionHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        sessions={sessions ?? []}
        activeSessionId={activeSessionId}
        onPick={id => {
          createdSessionRef.current = null
          setActiveSessionId(id)
          setPendingSubmit(null)
          setHistoryOpen(false)
        }}
        onStartNew={() => {
          createdSessionRef.current = null
          setActiveSessionId(undefined)
          setPendingSubmit(null)
          setHistoryOpen(false)
        }}
      />

      {models && (
        <VideoEditModelPickerModal
          open={modelPickerOpen}
          onClose={() => setModelPickerOpen(false)}
          models={models}
          selectedId={model?.id ?? null}
          onSelect={setSelectedModelId}
        />
      )}
    </div>
  )
}
