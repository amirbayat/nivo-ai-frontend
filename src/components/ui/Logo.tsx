import { useThemeStore } from '@/store/theme.store'
import darkLogoUrl from '@/assets/brand/horizontal-dark.svg'
import darkLogoIntlUrl from '@/assets/brand/horizontal-intl-dark.svg'

// روی تم تیره لوگوی سفید-متن (assets/brand) درست است، اما همان فایل روی پس‌زمینه‌ی سفید
// نامرئی می‌شود (متن «ai» با fill سفید) — public/brand2/horizontal.svg همان لوگو با متن
// مشکی است، مخصوص پس‌زمینه‌ی روشن.
//
// variant="intl": همان مارک با متن «nivoai.site» کنارش — فقط برای لندینگ/صفحات INTL، تا
// برندینگ صریحاً به دامنه‌ی nivoai.site اشاره کند (نه نسخه‌ی ir/nivoai.ir)
export function Logo({ className, variant = 'default' }: { className?: string; variant?: 'default' | 'intl' }) {
  const theme = useThemeStore(s => s.theme)
  const isLight = theme === 'light'
  if (variant === 'intl') {
    return <img src={isLight ? '/brand2/horizontal-intl.svg' : darkLogoIntlUrl} alt="nivoai.site" className={className} />
  }
  return <img src={isLight ? '/brand2/horizontal.svg' : darkLogoUrl} alt="نیوو" className={className} />
}
