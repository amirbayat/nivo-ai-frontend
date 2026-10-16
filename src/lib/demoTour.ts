// DEMO-5 — تور «اول خریدار، بعد فروشنده». چیپ‌های شروع هر دسته (slug دسته مثل demoCategories.ts)؛
// دسته‌ای که اینجا نیست چیپ عمومی می‌گیرد.
export const DEMO_TOUR_FALLBACK_CHIPS = ['چی پیشنهاد می‌دی؟']

export const DEMO_TOUR_CHIPS: Record<string, string[]> = {
  clothing: ['این مانتو سایز L داره؟', 'ارسال به شیراز چقدر طول می‌کشه؟', 'جنسش چیه؟'],
  'bags-shoes': ['کفش‌ها کوچیک میزنن یا بزرگ؟', 'جنس رویه‌اش چرمه؟', 'ارسال به مشهد چقدره؟'],
  cosmetics: ['اصله؟ تاریخ انقضاش چقدره؟', 'برای پوست خشک مناسبه؟', 'روش مصرفش چطوره؟'],
  'home-kitchen': ['ابعادش چقدره؟', 'تو ماشین ظرفشویی میشه شست؟', 'گارانتی داره؟'],
  digital: ['با آیفون ۱۵ سازگاره؟', 'گارانتی داره؟', 'اصله یا های‌کپی؟'],
  food: ['تاریخ انقضاش کیه؟', 'چطوری نگهداری بشه؟', 'ارسال به شهرستان دارین؟'],
  'kids-baby': ['برای چند ماهگی مناسبه؟', 'جنسش ایمنه؟', 'سایزبندیش چطوره؟'],
  'sports-travel': ['برای مبتدی مناسبه؟', 'ضد آبه؟', 'وزنش چقدره؟'],
  jewelry: ['عیارش چنده؟', 'فاکتور و ضمانت میدین؟', 'اجرتش چقدره؟'],
  'books-stationery': ['نوبت چاپش چنده؟', 'نو هست یا دست‌دوم؟', 'ارسال چند روزه‌ست؟'],
  'flowers-plants': ['به چقدر نور و آب نیاز داره؟', 'ارسال پستی سالم می‌رسه؟', 'برای گربه خطر نداره؟'],
  handicrafts: ['دست‌سازه؟ از کجاست؟', 'ابعادش چقدره؟', 'سفارش اختصاصی می‌گیرین؟'],
  pets: ['برای سگ بالغ مناسبه؟', 'ترکیباتش چیه؟', 'تاریخ انقضاش؟'],
  'online-courses': ['سرفصل‌ها چیه؟', 'دسترسی‌ش مادام‌العمره؟', 'پشتیبانی داره؟'],
  'carpets-antiques': ['رجش چنده؟', 'شناسنامه داره؟', 'ارسال بیمه‌شده‌ست؟'],
  'repair-services': ['زمان تعمیر چقدره؟', 'گارانتی تعمیر دارین؟', 'هزینه‌ی کارشناسی چقدره؟'],
}

// slug فروشگاه دمو: demo-<categorySlug>-<8 hex>
export function demoCategorySlugFromShop(shopSlug: string): string | null {
  const m = shopSlug.match(/^demo-(.+)-[0-9a-f]{8}$/)
  return m ? m[1] : null
}

export function demoTourChips(shopSlug: string): string[] {
  const cat = demoCategorySlugFromShop(shopSlug)
  return (cat && DEMO_TOUR_CHIPS[cat]) || DEMO_TOUR_FALLBACK_CHIPS
}
