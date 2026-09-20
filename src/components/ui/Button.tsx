import { clsx } from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'md' && 'h-11 px-5 text-sm',
        size === 'sm' && 'h-8 px-3 text-xs',
        variant === 'primary' && 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95',
        variant === 'ghost' && 'bg-transparent text-slate-300 hover:bg-slate-700/60 light:text-slate-600 light:hover:bg-slate-100',
        variant === 'danger' && 'bg-red-500/10 text-red-400 hover:bg-red-500/20 light:text-red-600',
        className,
      )}
      {...props}
    >
      {loading && (
        <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {children}
    </button>
  )
}
