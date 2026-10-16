import { Link } from 'react-router-dom'

// docs/PRD-nivo-lead-shop-seller-signup.md — صفحه‌ی عمومی «شرایط استفاده» (لینک کارت ثبت‌نام و شیت درباره‌ی نیوو).
// متن پیش‌نویس عمومی است؛ قبل از تبلیغ گسترده توسط بخش حقوقی بازبینی شود
const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: 'درباره‌ی نیوو',
    items: [
      'نیوو یک ابزار فروش هوشمند است که به فروشندگان کمک می‌کند در پیام‌رسان‌ها و شبکه‌های اجتماعی به مشتریان پاسخ بدهند، سفارش ثبت کنند و فروشگاه خود را مدیریت کنند.',
      'با ثبت‌نام و استفاده از نیوو، این شرایط را می‌پذیرید.',
    ],
  },
  {
    title: 'حساب کاربری',
    items: [
      'ثبت‌نام با شماره موبایل و کد تأیید پیامکی انجام می‌شود. شماره‌ای که وارد می‌کنید باید متعلق به خودتان باشد.',
      'مسئولیت فعالیت‌های انجام‌شده با حساب شما بر عهده‌ی خودتان است؛ کد تأیید را با کسی در میان نگذارید.',
    ],
  },
  {
    title: 'مسئولیت فروشنده',
    items: [
      'محتوای فروشگاه، قیمت‌ها، موجودی، ارسال و پاسخگویی به مشتریان بر عهده‌ی فروشنده است.',
      'پرداخت مشتری مستقیماً به فروشنده انجام می‌شود و نیوو فقط ابزار گفتگو و مدیریت سفارش است.',
      'فروش کالا و خدمات خلاف قوانین جمهوری اسلامی ایران ممنوع است و در صورت مشاهده، فروشگاه معلق می‌شود.',
    ],
  },
  {
    title: 'دستیار هوشمند',
    items: [
      'پاسخ‌های دستیار هوشمند با هوش مصنوعی تولید می‌شود و ممکن است گاهی دقیق نباشد؛ مسئولیت بررسی اطلاعات مهم (مثل قیمت و موجودی) با فروشنده است.',
    ],
  },
  {
    title: 'حریم خصوصی',
    items: [
      'شماره موبایل و اطلاعات گفتگو فقط برای ارائه‌ی خدمت، پشتیبانی و بهبود نیوو استفاده می‌شود و بدون رضایت شما به شخص ثالث فروخته نمی‌شود.',
    ],
  },
  {
    title: 'تغییر شرایط و تماس',
    items: [
      'نیوو می‌تواند این شرایط را به‌روزرسانی کند؛ ادامه‌ی استفاده به‌معنی پذیرش نسخه‌ی جدید است.',
      'برای هر سؤالی از صفحه‌ی «تماس با ما» با ما در ارتباط باشید.',
    ],
  },
]

export function TermsPage() {
  return (
    <div className="relative min-h-screen bg-[#020C18] text-slate-100" dir="rtl">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-1 text-lg">
          <span className="font-bold text-emerald-400/70">ni</span>
          <span className="font-bold">vo</span>
        </Link>
        <Link to="/" className="flex min-h-11 items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-300">
          <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden>
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          بازگشت به صفحه اصلی
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-8 sm:pt-12">
        <h1 className="text-3xl font-bold text-slate-100 sm:text-4xl">شرایط استفاده از نیوو</h1>
        <div className="mt-10 flex flex-col gap-8">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-bold text-emerald-400">{section.title}</h2>
              <ul className="mt-3 flex flex-col gap-2 text-[15px] leading-8 text-slate-300">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
