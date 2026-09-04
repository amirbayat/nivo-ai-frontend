import { clsx } from 'clsx'
import type { ModelCatalogEntry } from '@/queries/plans.queries'
import type { StudioAspectRatio } from '@/types/api'
import { AspectRatioSegmented, ModelRadioList } from './ModelPickers'
import type { VideoStudioStage } from './VideoStudioGallery'

// docs/PRD-video-studio-chat-flow.md + دستور صریح کاربر: «موبایل رو مثل ایمیج استودیو کن —
// مدال بزرگ و انیمیشن‌دار» + «یک دکمه‌ی تنظیمات، نه چیپ‌های پراکنده — هم روی موبایل هم دسکتاپ».
// موبایل: پنل تمام‌صفحه با اسلاید از پایین (همون مکانیزم StudioComposer.tsx). دسکتاپ: همون
// محتوا، ولی به‌جای تمام‌صفحه یک مودال وسط‌صفحه با بک‌دراپ و فید/اسکیل.
export function VideoStudioSettingsModal({
  open,
  onClose,
  stage,
  chatModels,
  photoModels,
  videoModels,
  chatModelId,
  photoModelId,
  videoModelId,
  imageAspectRatio,
  videoAspectRatio,
  onSelectChatModel,
  onSelectPhotoModel,
  onSelectVideoModel,
  onSelectImageAspectRatio,
  onSelectVideoAspectRatio,
}: {
  open: boolean
  onClose: () => void
  stage: VideoStudioStage
  chatModels: ModelCatalogEntry[]
  photoModels: ModelCatalogEntry[]
  videoModels: ModelCatalogEntry[]
  chatModelId: string | null
  photoModelId: string | null
  videoModelId: string | null
  imageAspectRatio: string | null
  videoAspectRatio: string | null
  onSelectChatModel: (name: string) => void
  onSelectPhotoModel: (name: string) => void
  onSelectVideoModel: (name: string) => void
  onSelectImageAspectRatio: (v: StudioAspectRatio) => void
  onSelectVideoAspectRatio: (v: StudioAspectRatio) => void
}) {
  const showPhoto = stage === 'character' || stage === 'storyboard'
  const showImageRatio = stage === 'storyboard'
  const showVideo = stage === 'render' || stage === 'result'

  return (
    <div
      className={clsx(
        'absolute inset-0 z-[25] flex flex-col justify-end transition-opacity duration-300 ease-out sm:items-center sm:justify-center sm:p-6',
        open ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      {/* بک‌دراپ — روی موبایل زیر پنل تمام‌صفحه مخفی می‌ماند، روی دسکتاپ پشت مودال دیده می‌شود */}
      <div className="absolute inset-0 sm:bg-black/60" onClick={onClose} />

      <div
        className={clsx(
          'relative flex h-full w-full flex-col overflow-hidden bg-[#020C18] transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full',
          'sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-md sm:translate-y-0 sm:rounded-3xl sm:border sm:shadow-2xl',
        )}
        style={{ borderColor: 'rgba(148,163,184,0.22)' }}
      >
        <div
          className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-700/50 px-4 pb-3"
          style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}
        >
          <span className="text-[14.5px] font-bold text-white">مدل‌ها و ابعاد</span>
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

        <div className="flex-1 overflow-y-auto px-4 pt-4" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
          <section className="mb-6">
            <h3 className="mb-2.5 text-[12.5px] font-bold text-slate-300">مدل چت (گفتگو)</h3>
            <ModelRadioList models={chatModels} selectedName={chatModelId} onSelect={onSelectChatModel} />
          </section>

          {showPhoto && (
            <section className="mb-6">
              <h3 className="mb-2.5 text-[12.5px] font-bold text-slate-300">مدل عکس (کاراکتر/استوری‌برد)</h3>
              <ModelRadioList models={photoModels} selectedName={photoModelId} onSelect={onSelectPhotoModel} />
              {showImageRatio && (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[12px] text-slate-400">ابعاد تصویر</span>
                  <AspectRatioSegmented value={imageAspectRatio} onChange={onSelectImageAspectRatio} size="sm" />
                </div>
              )}
            </section>
          )}

          {showVideo && (
            <section className="mb-6">
              <h3 className="mb-2.5 text-[12.5px] font-bold text-slate-300">مدل ویدیو</h3>
              <ModelRadioList models={videoModels} selectedName={videoModelId} onSelect={onSelectVideoModel} />
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[12px] text-slate-400">ابعاد ویدیو</span>
                <AspectRatioSegmented value={videoAspectRatio} onChange={onSelectVideoAspectRatio} size="sm" />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
