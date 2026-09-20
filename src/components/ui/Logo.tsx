import { useThemeStore } from '@/store/theme.store'
import darkLogoUrl from '@/assets/brand/horizontal-dark.svg'

// روی تم تیره لوگوی سفید-متن (assets/brand) درست است، اما همان فایل روی پس‌زمینه‌ی سفید
// نامرئی می‌شود (متن «ai» با fill سفید) — public/brand2/horizontal.svg همان لوگو با متن
// مشکی است، مخصوص پس‌زمینه‌ی روشن.
export function Logo({ className }: { className?: string }) {
  const theme = useThemeStore(s => s.theme)
  return <img src={theme === 'light' ? '/brand2/horizontal.svg' : darkLogoUrl} alt="نیوو" className={className} />
}
