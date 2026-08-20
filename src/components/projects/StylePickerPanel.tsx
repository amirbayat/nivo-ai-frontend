import { useDiscoveryCatalog } from '@/queries/discovery.queries'
import { PromptMasonryGrid } from '@/components/discover/PromptMasonryGrid'
import { fa } from '@/locales/fa'
import type { CreativePromptCatalogItem } from '@/types/api'

// پنل انتخاب یک سبک از کاتالوگ برای پین‌کردن روی پروژه — هم توی ProjectModal (موقع
// ساخت/ویرایش پروژه) و هم توی ProjectDetailPage (وقتی هنوز سبکی پین نشده) استفاده می‌شه.
// از همون useDiscoveryCatalog که سمت سرور فقط isActive:true برمی‌گردونه، پس هر آیتمش
// برای پین‌کردن معتبره — و همون‌طور که کاتالوگ اصلی هیچ‌وقت template/context رو برنمی‌گردونه،
// اینجا هم فقط title/exampleImageUrl/creditCost/outputType دیده می‌شه.
export function StylePickerPanel({
  onPick,
  disabled,
}: {
  onPick: (item: CreativePromptCatalogItem) => void
  disabled?: boolean
}) {
  const { data: catalog, isLoading } = useDiscoveryCatalog({})

  return (
    <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900/40 p-3">
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="size-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        </div>
      ) : !catalog?.length ? (
        <p className="py-8 text-center text-xs text-slate-600">{fa.discover.empty}</p>
      ) : (
        <PromptMasonryGrid
          items={catalog}
          onSelect={onPick}
          disabled={disabled}
          columns="columns-2 sm:columns-3"
          selectLabel={fa.projects.pinStyleCta}
        />
      )}
    </div>
  )
}
