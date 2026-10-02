import { clsx } from 'clsx'

// از SellerStoreSettingsPage.tsx به اینجا منتقل شد تا SellerProductEditPage.tsx هم همین
// کامپوننت را استفاده کند (docs/PRD-sales-agent-persuasion-principles.md بخش ۶.۴)
export function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-2.5">
      <span className="text-sm text-slate-300 light:text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-emerald-500' : 'bg-slate-700 light:bg-slate-300',
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 size-5 rounded-full bg-white transition-transform',
            checked ? 'right-0.5' : 'right-[1.375rem]',
          )}
        />
      </button>
    </label>
  )
}
