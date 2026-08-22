import { useDeleteFoodLog } from '@/queries/nivoCal.queries'
import { useToastStore } from '@/store/toast.store'
import { fa } from '@/locales/fa'

interface DeleteLogButtonProps {
  id: string
}

// برای حذف اسکن‌های اشتباهی/تستی — بدون دیالوگ تأیید، هم‌الگو با حذف پروژه در ProjectModal.tsx
export function DeleteLogButton({ id }: DeleteLogButtonProps) {
  const deleteLog = useDeleteFoodLog()

  return (
    <button
      onClick={() => deleteLog.mutate(id, { onError: () => useToastStore.getState().addToast(fa.nivoCalDashboard.deleteLogFailed) })}
      disabled={deleteLog.isPending}
      aria-label={fa.common.delete}
      className="flex size-7 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-40"
    >
      {deleteLog.isPending ? (
        <div className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="size-4">
          <path d="M6 7h12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m3 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}
