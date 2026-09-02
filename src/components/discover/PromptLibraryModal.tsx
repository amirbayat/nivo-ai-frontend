import { useEffect } from 'react'
import { useDiscoveryCatalog } from '@/queries/discovery.queries'
import { PromptMasonryGrid } from './PromptMasonryGrid'
import type { CreativePromptCatalogItem } from '@/types/api'

// نسخه‌ی «داخل صفحه» کاتالوگ استودیوی محتوا — برخلاف DiscoverPage که یک صفحه‌ی جداست و با
// انتخاب یک کارت کاربر را به یک مکالمه‌ی چت می‌برد، این مودال همان‌جا (روی استودیوی عکس یا هر
// composer دیگری) باز می‌شود و با انتخاب فقط onSelect را صدا می‌زند — بدون navigate. فقط سبک‌های
// IMAGE را نشان می‌دهد چون مصرف‌کننده‌ی فعلی‌اش (StudioComposer) فقط تولید عکس است.
export function PromptLibraryModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (item: CreativePromptCatalogItem) => void
}) {
  const { data: catalog, isLoading } = useDiscoveryCatalog({ outputType: 'IMAGE' })

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl bg-slate-950 sm:max-h-[80vh] sm:max-w-3xl sm:rounded-3xl"
        style={{ border: '1px solid rgba(148,163,184,0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="text-[15px] font-bold text-slate-100">پرامپت‌های آماده</h2>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            aria-label="بستن"
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="size-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            </div>
          ) : !catalog?.length ? (
            <p className="py-16 text-center text-sm text-slate-600">هنوز پرامپتی اضافه نشده</p>
          ) : (
            <PromptMasonryGrid items={catalog} onSelect={onSelect} columns="columns-2 sm:columns-3" />
          )}
        </div>
      </div>
    </div>
  )
}
