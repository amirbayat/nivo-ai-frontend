import { BottomSheet } from '@/components/ui/BottomSheet'
import { productImageUrl } from '@/components/shop/ShopUiBlocks'
import { fa } from '@/locales/fa'
import type { CartLineView } from '@/lib/optimisticCart'

interface CartSheetProps {
  open: boolean
  onClose: () => void
  lines: CartLineView[]
  total: number
  stale: boolean
  // عملیات سبد هنوز در راه سرور است؛ تا برگردد «ادامه» غیرفعال می‌ماند تا CONFIRM_CART روی سبد کهنه نرود
  pending: boolean
  // «ادامه» زده شده ولی پاسخ تایپی هنوز در راه است؛ بعد از پایان نوبت خودکار می‌رود
  continuing: boolean
  requiresShipping: boolean
  freeShipping: boolean
  // productId → اولین عکس (از داده‌ی شناخته‌شده)؛ نبودنش = حرف اول نام
  imageKeys: Map<string, string>
  // سقف موجودی‌ِ شناخته‌شده‌ی هر خط؛ نبودنش = نامحدود
  stockLimit: (line: CartLineView) => number
  disabled: boolean
  onSetQty: (line: CartLineView, qty: number) => void
  onRemove: (line: CartLineView) => void
  onContinue: () => void
  onSeeProducts: () => void
}

const stepBtn = 'flex size-11 items-center justify-center rounded-xl border border-[var(--shop-border)] text-lg text-[var(--shop-text)] disabled:opacity-40'

// docs/PRD-buyer-chat-redesign.md §6.6 — شیت سبد: خط‌ها با تصویر، قیمت واحد، گام‌شمار ۴۴px و «حذف»؛ جمع، توضیح
// ارسال، یادآوری کد تخفیف در گفتگو، و دکمه‌ی «ادامه و ثبت آدرس / ادامه و پرداخت» (CONFIRM_CART)
export function CartSheet(props: CartSheetProps) {
  const { lines, total } = props
  return (
    <BottomSheet
      open={props.open}
      onClose={props.onClose}
      closeOnBack
      title={fa.shop.v2.cartTitle}
      footer={
        lines.length > 0 ? (
          <button
            type="button"
            onClick={props.onContinue}
            disabled={props.disabled || props.pending || props.continuing}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--shop-accent-fill)] text-[15px] font-bold text-[var(--shop-accent-text)] disabled:opacity-50"
          >
            {props.continuing && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
            {props.continuing ? fa.shop.v2.cartContinuing : props.requiresShipping ? fa.shop.v2.toAddress : fa.shop.v2.toPayment}
          </button>
        ) : (
          <button
            type="button"
            onClick={props.onSeeProducts}
            className="min-h-12 w-full rounded-xl bg-[var(--shop-accent-fill)] text-[15px] font-bold text-[var(--shop-accent-text)]"
          >
            {fa.shop.v2.seeProducts}
          </button>
        )
      }
    >
      {lines.length === 0 ? (
        <p className="py-8 text-center text-[15px] text-[var(--shop-text-2)]">{fa.shop.v2.cartEmpty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {lines.map((line) => {
            const key = `${line.productId}-${line.variantId ?? ''}`
            const image = props.imageKeys.get(line.productId)
            const limit = props.stockLimit(line)
            return (
              <div key={key} className="flex gap-3 rounded-2xl border border-[var(--shop-border)] p-3">
                {image ? (
                  <img src={productImageUrl(line.productId, image)} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-[var(--shop-surface-2)] text-xl font-bold text-[var(--shop-text-2)]" aria-hidden>
                    {line.name.trim().charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium leading-6 text-[var(--shop-text)]">
                    {line.name}
                    {line.variantLabel ? <span className="text-[var(--shop-text-2)]"> ({line.variantLabel})</span> : null}
                  </p>
                  <p className="text-sm text-[var(--shop-text-2)]">{line.unitPrice.toLocaleString('fa-IR')} تومان</p>
                  <div className="mt-1 flex items-center gap-1">
                    {line.qty <= 1 ? (
                      <button type="button" disabled={props.disabled} aria-label={fa.shop.v2.remove} onClick={() => props.onRemove(line)} className={stepBtn}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5 text-[var(--shop-danger)]" aria-hidden>
                          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" />
                        </svg>
                      </button>
                    ) : (
                      <button type="button" disabled={props.disabled} aria-label={fa.shop.v2.decrease} onClick={() => props.onSetQty(line, line.qty - 1)} className={stepBtn}>
                        −
                      </button>
                    )}
                    <span className="min-w-8 text-center text-[15px] font-semibold text-[var(--shop-text)]">{line.qty.toLocaleString('fa-IR')}</span>
                    <button
                      type="button"
                      disabled={props.disabled || line.qty >= limit}
                      aria-label={fa.shop.v2.increase}
                      onClick={() => props.onSetQty(line, line.qty + 1)}
                      className={stepBtn}
                    >
                      +
                    </button>
                    {line.qty > 1 && (
                      <button type="button" disabled={props.disabled} onClick={() => props.onRemove(line)} className="ms-auto min-h-11 px-2 text-sm text-[var(--shop-danger)] disabled:opacity-40">
                        {fa.shop.v2.remove}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <div className="flex items-center justify-between border-t border-[var(--shop-border)] pt-3 text-[15px] font-bold text-[var(--shop-text)]">
            <span>{fa.shop.v2.cartSubtotal}</span>
            <span aria-live="polite">{props.stale ? fa.shop.v2.cartUpdating : `${total.toLocaleString('fa-IR')} تومان`}</span>
          </div>
          {props.requiresShipping && (
            <p className="text-sm text-[var(--shop-text-2)]">{props.freeShipping ? fa.shop.v2.cartShippingFree : fa.shop.v2.cartShippingLater}</p>
          )}
          <p className="text-sm text-[var(--shop-text-2)]">{fa.shop.v2.cartDiscountHint}</p>
        </div>
      )}
    </BottomSheet>
  )
}
