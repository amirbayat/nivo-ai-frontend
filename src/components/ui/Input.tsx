import { clsx } from 'clsx'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
}

export function Input({ error, label, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm text-slate-400 light:text-slate-600">{label}</label>}
      <input
        className={clsx(
          'w-full rounded-xl border bg-slate-800/80 px-4 py-3 text-sm text-slate-100',
          'placeholder:text-slate-500 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500',
          'light:bg-white light:text-slate-900 light:placeholder:text-slate-400',
          error ? 'border-red-500/60' : 'border-slate-700 hover:border-slate-600 light:border-slate-300 light:hover:border-slate-400',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400 light:text-red-600">{error}</p>}
    </div>
  )
}
