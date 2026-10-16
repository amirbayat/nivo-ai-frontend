import { BottomSheet } from '@/components/ui/BottomSheet'
import { fa } from '@/locales/fa'
import { avatarInitials, storeLogoUrl } from '@/components/shop/shopUtils'
import type { PublicStoreAbout } from '@/types/api'

interface AboutStoreSheetProps {
  open: boolean
  onClose: () => void
  storeId: string | null | undefined
  storeName: string | null | undefined
  storeLogoKey: string | null | undefined
  about: PublicStoreAbout | null
  failed: boolean
  onReload: () => void
  // حالت لید: بدون روش پرداخت/ارسال/مرجوعی؛ فقط معرفی کوتاه + تماس
  leadMode?: boolean
}

function monthLabel(memberSince: string): string | null {
  const [y, m] = memberSince.split('-').map(Number)
  if (!y || !m) return null
  return new Date(y, m - 1, 15).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long' })
}

function costRange(range: { minCostToman: number; maxCostToman: number }): string {
  if (range.maxCostToman === 0) return fa.shop.v2.aboutFree
  const f = (n: number) => `${n.toLocaleString('fa-IR')} تومان`
  return range.minCostToman === range.maxCostToman ? f(range.minCostToman) : `${f(range.minCostToman)} تا ${f(range.maxCostToman)}`
}

// docs/PRD-buyer-chat-redesign.md §6.12 (E4.1 حداقلی) — همه‌ی خطوط از B4 می‌آیند و هر خط خالی پنهان است
export function AboutStoreSheet({ open, onClose, storeId, storeName, storeLogoKey, about, failed, onReload, leadMode }: AboutStoreSheetProps) {
  const name = about?.name ?? storeName ?? ''
  const logoKey = about?.logoKey ?? storeLogoKey
  const member = about ? monthLabel(about.memberSince) : null
  const lines: string[] = []
  if (about && !leadMode) {
    if (member) lines.push(fa.shop.v2.aboutMember(member))
    if (about.successfulOrders != null) lines.push(fa.shop.v2.aboutOrders(about.successfulOrders))
    if (about.approvalEtaLabel) lines.push(fa.shop.v2.aboutEta(about.approvalEtaLabel))
    if (about.shippingDaysText) lines.push(fa.shop.v2.aboutShipping(about.shippingDaysText))
    if (about.shippingCostRange) lines.push(fa.shop.v2.aboutShippingCost(costRange(about.shippingCostRange)))
    if (about.paymentMethods.length > 0) {
      lines.push(fa.shop.v2.aboutPayments(about.paymentMethods.map((m) => fa.shop.paymentMethodLabels[m] ?? m).join(' · ')))
    }
  }
  return (
    <BottomSheet open={open} onClose={onClose} closeOnBack title={leadMode ? fa.shop.lead.menuAbout : fa.shop.v2.aboutTitle(name)}>
      <div className="flex flex-col gap-4 pb-2">
        <div className="flex items-center gap-3">
          {storeId && logoKey ? (
            <img src={storeLogoUrl(storeId, logoKey)} alt="" className="size-16 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[var(--shop-surface-2)] text-xl text-[var(--shop-text-2)]" aria-hidden>
              {avatarInitials(name)}
            </div>
          )}
          <p className="text-lg font-bold text-[var(--shop-text)]">{name}</p>
        </div>

        {leadMode && <p className="text-[15px] leading-7 text-[var(--shop-text)]">{fa.shop.lead.aboutIntro}</p>}

        {!leadMode && !about && !failed && (
          <div className="animate-pulse motion-reduce:animate-none space-y-2" aria-hidden>
            <div className="h-4 w-2/3 rounded bg-[var(--shop-surface-2)]" />
            <div className="h-4 w-1/2 rounded bg-[var(--shop-surface-2)]" />
          </div>
        )}
        {!leadMode && failed && !about && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-[var(--shop-text-2)]">{fa.shop.v2.aboutLoadError}</p>
            <button type="button" onClick={onReload} className="min-h-11 rounded-xl border border-[var(--shop-border)] px-4 text-sm text-[var(--shop-text)]">
              {fa.shop.v2.retry}
            </button>
          </div>
        )}

        {lines.length > 0 && (
          <ul className="flex flex-col gap-2 text-[15px] text-[var(--shop-text)]">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}

        {!leadMode && about?.returnPolicyText && (
          <details className="rounded-xl border border-[var(--shop-border)] px-3">
            <summary className="min-h-11 cursor-pointer py-3 text-[15px] font-medium text-[var(--shop-text)]">{fa.shop.v2.aboutReturn}</summary>
            <p className="whitespace-pre-line pb-3 text-sm leading-7 text-[var(--shop-text-2)]">{about.returnPolicyText}</p>
          </details>
        )}

        {leadMode ? (
          <div className="border-t border-[var(--shop-border)] pt-3 text-xs leading-6 text-[var(--shop-text-2)]">
            {/* همان تب (بدون _blank) — در مرورگر اینستاگرام تب جدید نشست را از دست می‌دهد */}
            <a href="/contact" className="inline-flex min-h-11 items-center text-[var(--shop-accent)] underline">
              {fa.shop.lead.aboutContact}
            </a>
          </div>
        ) : (
          <div className="border-t border-[var(--shop-border)] pt-3 text-xs leading-6 text-[var(--shop-text-2)]">
            <p>{fa.shop.v2.aboutFooter}</p>
            <a href="/terms" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-[var(--shop-accent)] underline">
              {fa.shop.v2.aboutTerms}
            </a>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
