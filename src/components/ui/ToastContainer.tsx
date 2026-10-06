import { clsx } from 'clsx'
import { useToastStore } from '@/store/toast.store'
import { env } from '@/env'

// docs/PRD-instagram-smart-dm-and-ir-intl-split.md بخش ۳.۱ — روی بیلد INTL متن انگلیسی/LTR
// است؛ dir/چیدمان متن باید با ریجن عوض شود، وگرنه toast انگلیسی راست‌چین نشان داده می‌شود
export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()
  if (!toasts.length) return null
  const isIntl = env.VITE_REGION === 'INTL'

  return (
    <div
      dir={isIntl ? 'ltr' : 'rtl'}
      className="fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          role="alert"
          onClick={() => removeToast(toast.id)}
          className={clsx(
            'w-full max-w-sm cursor-pointer rounded-xl border border-amber-500/30 bg-slate-800/95 px-4 py-3 text-sm font-medium text-amber-300 shadow-lg backdrop-blur',
            isIntl ? 'text-left' : 'text-right',
          )}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
