import { useEffect, useMemo, useState } from 'react'
import { fa } from '@/locales/fa'

const ROTATE_MS = 3000

const GENERIC = [
  'دارم پیامت رو می‌خونم…',
  'یه نگاه به اطلاعات فروشگاه می‌ندازم…',
  'دنبال بهترین جواب برات می‌گردم…',
  'چند لحظه‌ی دیگه جواب آماده‌ست…',
]

// عبارت‌های مرتبط با موضوع آخرین پیام خریدار؛ اولین دسته‌ای که کلیدواژه‌اش بیاید، قبل از عمومی‌ها می‌آید
const TOPICS: { test: RegExp; phrases: string[] }[] = [
  {
    test: /ارسال|پست|تحویل|روزه|چند روز|پیک|هزینه.?ی? ارسال/,
    phrases: ['قوانین ارسال فروشگاه رو چک می‌کنم…', 'زمان تحویل رو بررسی می‌کنم…', 'روش‌های ارسال به شهرت رو می‌بینم…'],
  },
  {
    test: /قیمت|تخفیف|ارزون|گرون|چنده|چقدر|تومن|تومان/,
    phrases: ['قیمت‌ها رو چک می‌کنم…', 'ببینم تخفیف یا کد تخفیفی هست یا نه…'],
  },
  {
    test: /موجود|سایز|رنگ|تعداد|انبار|دارین|داری/,
    phrases: ['موجودی انبار رو نگاه می‌کنم…', 'سایز و رنگ‌های موجود رو بررسی می‌کنم…'],
  },
  {
    test: /سفارش|پیگیری|رسید|پرداخت|کد|کارت/,
    phrases: ['وضعیت سفارش و پرداختت رو پیدا می‌کنم…', 'اطلاعات سفارش رو مرور می‌کنم…'],
  },
  {
    test: /محصول|مدل|پیشنهاد|بهترین|مناسب|می‌خوام|میخوام|دنبال/,
    phrases: ['محصولات مرتبط رو پیدا می‌کنم…', 'گزینه‌های مناسب برات کنار هم می‌ذارم…'],
  },
]

export function thinkingPhrases(lastCustomerText: string | undefined, hint: string | null): string[] {
  const topical = TOPICS.filter((t) => lastCustomerText && t.test.test(lastCustomerText)).flatMap((t) => t.phrases)
  const list = [...(hint ? [hint] : []), ...topical, ...GENERIC]
  return list.filter((p, i) => list.indexOf(p) === i)
}

interface Props {
  /** متن وضعیت زنده‌ی بک‌اند (مثلاً «دارم محصولات رو جستجو می‌کنم…») — اولین عبارت نمایش داده می‌شود */
  hint: string | null
  lastCustomerText?: string
}

/** حباب نقطه‌های لودینگ (شکل حباب ایجنت) + زیرش عبارت‌های مرتبطی که هر ۳ ثانیه با انیمیشن عوض می‌شوند.
 *  docs/PRD-buyer-chat-redesign.md §6.4.2 — بعد از ۲۰ ثانیه بدون پاسخ، «طول کشید؛ هنوز دارم نگاه می‌کنم…» */
const SLOW_AFTER_MS = 20_000

export function ThinkingIndicator({ hint, lastCustomerText }: Props) {
  const phrases = useMemo(() => thinkingPhrases(lastCustomerText, hint), [lastCustomerText, hint])
  const [index, setIndex] = useState(0)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    setIndex(0)
    const t = window.setInterval(() => setIndex((i) => (i + 1) % phrases.length), ROTATE_MS)
    return () => window.clearInterval(t)
  }, [phrases])

  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className="flex flex-col items-start gap-1.5" role="status" aria-live="polite">
      <div className="rounded-[18px] rounded-tl-[4px] bg-[var(--shop-surface-2)] px-4 py-3">
        <div className="flex items-center gap-1" aria-hidden>
          <span className="size-1.5 animate-bounce motion-reduce:animate-none rounded-full bg-[var(--shop-text-2)]" style={{ animationDelay: '0ms' }} />
          <span className="size-1.5 animate-bounce motion-reduce:animate-none rounded-full bg-[var(--shop-text-2)]" style={{ animationDelay: '150ms' }} />
          <span className="size-1.5 animate-bounce motion-reduce:animate-none rounded-full bg-[var(--shop-text-2)]" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
      <p key={slow ? 'slow' : index} className="thinking-phrase ps-1 text-xs text-[var(--shop-text-2)]">
        {slow ? fa.shop.v2.slowReply : phrases[index]}
      </p>
    </div>
  )
}
