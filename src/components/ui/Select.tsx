import { Fragment } from 'react'
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
import { clsx } from 'clsx'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
}

// جایگزین <select> خام (که popup گزینه‌هایش استایل مرورگر/سیستم‌عامل است، نه استایل اپ) —
// بر پایه‌ی Listbox بی‌رنگ @headlessui/react، با همون زبان بصری Input.tsx (بردر/پس‌زمینه/فوکوس emerald)
export function Select({ label, value, onChange, options, placeholder, className }: SelectProps) {
  const selected = options.find(o => o.value === value)

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm text-slate-400 light:text-slate-600">{label}</label>}
      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <ListboxButton
            className={clsx(
              'flex w-full items-center justify-between gap-2 rounded-xl border bg-slate-800/80 px-4 py-3 text-sm text-slate-100',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500',
              'light:bg-white light:text-slate-900',
              'border-slate-700 hover:border-slate-600 light:border-slate-300 light:hover:border-slate-400',
              className,
            )}
          >
            {({ open }) => (
              <>
                <span className={clsx('truncate', !selected && 'text-slate-500 light:text-slate-400')}>
                  {selected?.label ?? placeholder}
                </span>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={clsx('size-4 shrink-0 text-slate-500 transition-transform', open && 'rotate-180')}
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </>
            )}
          </ListboxButton>

          <ListboxOptions
            transition
            anchor="bottom start"
            className={clsx(
              'z-50 mt-1 max-h-60 w-[var(--button-width)] overflow-auto rounded-xl border p-1 shadow-lg',
              'bg-slate-800 light:bg-white border-slate-700 light:border-slate-300',
              'transition duration-100 ease-in data-[closed]:scale-95 data-[closed]:opacity-0',
            )}
          >
            {options.map(opt => (
              <ListboxOption key={opt.value} value={opt.value} as={Fragment}>
                {({ focus, selected: isSelected }) => (
                  <li
                    className={clsx(
                      'flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm',
                      focus ? 'bg-emerald-500/10 text-emerald-300 light:text-emerald-700' : 'text-slate-200 light:text-slate-800',
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0 text-emerald-400">
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </li>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>
    </div>
  )
}
