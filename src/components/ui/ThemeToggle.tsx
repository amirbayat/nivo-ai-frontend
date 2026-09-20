import { clsx } from 'clsx'
import { useThemeStore } from '@/store/theme.store'

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore(s => s.theme)
  const toggleTheme = useThemeStore(s => s.toggleTheme)

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="تغییر تم"
      className={clsx(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors',
        'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-emerald-500/40 hover:text-emerald-400',
        'light:border-slate-200 light:bg-white light:text-slate-500 light:hover:border-emerald-500/40 light:hover:text-emerald-600',
        className,
      )}
    >
      {theme === 'dark' ? <SunIcon className="size-4.5" /> : <MoonIcon className="size-4.5" />}
    </button>
  )
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10 15a5 5 0 100-10 5 5 0 000 10zM10 0a1 1 0 011 1v1a1 1 0 11-2 0V1a1 1 0 011-1zm0 17a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM3.05 3.05a1 1 0 011.414 0l.707.707A1 1 0 013.757 5.17l-.707-.707a1 1 0 010-1.414zm12.02 12.02a1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zM0 10a1 1 0 011-1h1a1 1 0 110 2H1a1 1 0 01-1-1zm17 0a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zM3.05 16.95a1 1 0 010-1.414l.707-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zm12.02-12.02a1 1 0 010-1.414l.707-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0z" />
    </svg>
  )
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>
  )
}
