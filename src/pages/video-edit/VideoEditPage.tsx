import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useKieVideoModels, useVideoEditJobs } from '@/queries/videoEdit.queries'
import { GenerateVideoForm, EditVideoForm } from './VideoEditForms'
import { VideoEditGallery } from './VideoEditGallery'

type Tab = 'generate' | 'edit'

// docs/PRD-video-edit-omni-kie.md بخش ۸.۳ — دقیقاً الگوی چیدمانی VideoStudioPage.tsx:
// دسکتاپ = دو ستون (فرم راست ثابت / گالری چپ بزرگ) هر دو همیشه روی صفحه؛ موبایل = صفحه‌ی
// پایه فقط گالری + نوار جمع‌شده‌ی پایین که با تپ‌کردن یک مدال تمام‌صفحه (فرم) باز می‌کند
// (همون مکانیزم MobileChatModal، اینجا بدون چت چون این فیچر گفتگومحور نیست).
export function VideoEditPage() {
  const navigate = useNavigate()
  const { data: models } = useKieVideoModels()
  const { data: jobs } = useVideoEditJobs()
  const [tab, setTab] = useState<Tab>('generate')
  const [mobileFormOpen, setMobileFormOpen] = useState(false)
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined)

  // انتخابگر واقعی مدل — کاتالوگ دیگر فقط یک ردیف (Omni/Kie) نیست، مدل‌های OpenRouter هم دارد
  const model = models?.find(m => m.id === selectedModelId) ?? models?.[0]
  // مسیر EDIT (صحنه‌حفظ‌کننده با پنجره‌ی start/end) فقط برای Kie تایید و پیاده شده — برای مدل‌های
  // OpenRouter بک‌اند این حالت را رد می‌کند (video-edit.service.ts/validateAgainstMode)
  const editModeSupported = model?.provider !== 'OPENROUTER'

  useEffect(() => {
    if (!editModeSupported && tab === 'edit') setTab('generate')
  }, [editModeSupported, tab])

  const formPanel = (
    <div className="flex flex-1 flex-col overflow-y-auto px-1 pb-6">
      <div className="px-1 pb-1 pt-0.5">
        <p className="text-[12px] font-bold" style={{ color: '#34d399' }}>{model?.displayName ?? '...'}</p>
        <h1 className="mt-1.5 text-[16.5px] font-extrabold text-white" style={{ textWrap: 'balance' }}>
          {tab === 'generate' ? 'از پرامپت، عکس یا ویدیو یه ویدیوی تازه بساز' : 'ویدیوی خودتو با یه پرامپت ویرایش کن'}
        </h1>
        <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: '#64748b' }}>
          {tab === 'generate'
            ? 'هرچی داری اضافه کن — همه اختیاری‌اند به‌جز پرامپت'
            : 'بقیه‌ی صحنه دست‌نخورده می‌مونه، فقط چیزی که می‌خوای عوض بشه'}
        </p>
      </div>

      {models && models.length > 1 && (
        <div className="mt-3">
          <label className="mb-1 block text-[11.5px] font-bold" style={{ color: '#64748b' }}>مدل</label>
          <select
            value={model?.id}
            onChange={e => setSelectedModelId(e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-[13px] font-bold text-white"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.20)' }}
          >
            {models.map(m => (
              <option key={m.id} value={m.id} style={{ background: '#020C18' }}>{m.displayName}</option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-4 flex gap-1.5 rounded-full p-[5px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.20)' }}>
        <button
          type="button"
          onClick={() => setTab('generate')}
          className={clsx('flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[12.5px] font-bold')}
          style={{
            background: tab === 'generate' ? 'linear-gradient(90deg,#10b981,#34d399)' : 'transparent',
            color: tab === 'generate' ? '#02170f' : '#94a3b8',
          }}
        >
          تولید ویدیو
        </button>
        {editModeSupported && (
          <button
            type="button"
            onClick={() => setTab('edit')}
            className={clsx('flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[12.5px] font-bold')}
            style={{
              background: tab === 'edit' ? 'linear-gradient(90deg,#f43f5e,#fb7185)' : 'transparent',
              color: tab === 'edit' ? '#2b0410' : '#94a3b8',
            }}
          >
            ادیت ویدیو
          </button>
        )}
      </div>

      <div className="mt-3.5">
        {!model ? (
          <p className="px-1 py-8 text-center text-[13px]" style={{ color: '#64748b' }}>در حال بارگذاری مدل‌ها...</p>
        ) : tab === 'generate' ? (
          <GenerateVideoForm model={model} onCreated={() => setMobileFormOpen(false)} />
        ) : (
          <EditVideoForm model={model} onCreated={() => setMobileFormOpen(false)} />
        )}
      </div>
    </div>
  )

  return (
    <div className="flex flex-1 flex-col overflow-hidden" style={{ background: '#020C18' }} dir="rtl">
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
          <span className="text-[17px] font-bold text-white">ویرایش ویدیو</span>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col overflow-hidden sm:flex-row" style={{ padding: '20px 0' }}>
        {/* ── دسکتاپ: پنل فرم (راست) ── */}
        <div className="hidden shrink-0 flex-col sm:order-1 sm:flex sm:w-[400px] sm:pr-10">
          {formPanel}
        </div>

        {/* ── دسکتاپ: پنل گالری (چپ) ── */}
        <div className="order-1 hidden flex-1 flex-col overflow-y-auto px-5 pb-6 sm:order-2 sm:flex sm:px-10">
          <p className="mb-4 text-[13px]" style={{ color: '#64748b' }}>گالری تولید/ادیت‌های تو</p>
          <VideoEditGallery jobs={jobs ?? []} />
        </div>

        {/* ── موبایل: صفحه‌ی پایه = گالری + نوار جمع‌شده ── */}
        <div className="flex flex-1 flex-col overflow-hidden sm:hidden">
          <div className="flex-1 overflow-y-auto px-4 pb-3">
            <VideoEditGallery jobs={jobs ?? []} />
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
    </div>
  )
}
