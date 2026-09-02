import { useNavigate } from 'react-router-dom'
import { useImageStudioConversations } from '@/queries/conversation.queries'

// docs/PRD-openrouter-migration.md §۱۴.۴ — «ImageStudioHistory»: برخلاف Sidebar عمومی چت (که
// همه‌ی گفتگوها را قاطی نشان می‌دهد)، این پنل فقط گفتگوهایی را نشان می‌دهد که حداقل یک عکس
// تولید کرده‌اند (imageGenCount > 0) — دقیقاً همون فیلتری که تصمیم معماری §۱۴.۲ پیش‌بینی کرده بود
interface Props {
  open: boolean
  onClose: () => void
}

function conversationDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('fa-IR')
}

export function ImageStudioHistoryDrawer({ open, onClose }: Props) {
  const navigate = useNavigate()
  const { data, isLoading, fetchNextPage, hasNextPage } = useImageStudioConversations()
  const conversations = data?.pages.flatMap(p => p.items) ?? []

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex" dir="rtl">
      <div className="flex-1" onClick={onClose} />
      <div
        className="flex h-full w-full max-w-sm shrink-0 flex-col"
        style={{ background: '#080f1e', borderInlineStart: '1px solid rgba(148,163,184,0.16)' }}
      >
        <div className="flex shrink-0 items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(148,163,184,0.14)' }}>
          <span className="text-[15px] font-bold text-white">تاریخچه‌ی استودیوی عکس</span>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
            aria-label="بستن"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="size-7 animate-spin rounded-full border-2 border-slate-600/40" style={{ borderTopColor: '#34d399' }} />
            </div>
          ) : conversations.length === 0 ? (
            <p className="px-3 py-10 text-center text-[13px]" style={{ color: '#64748b' }}>
              هنوز هیچ گفتگویی توی استودیوی عکس عکس نساخته
            </p>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => {
                  navigate(`/image/${conv.id}`)
                  onClose()
                }}
                className="mb-1 flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-right transition-colors hover:bg-white/[0.05]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-slate-200">
                    {conv.title ?? 'بدون عنوان'}
                  </p>
                  <p className="mt-0.5 text-[11px]" style={{ color: '#64748b' }}>
                    {conversationDateLabel(conv.lastMessageAt)}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.24)', color: '#6ee7b7' }}
                >
                  {conv.imageGenCount} عکس
                </span>
              </button>
            ))
          )}
          {hasNextPage && (
            <button
              onClick={() => void fetchNextPage()}
              className="w-full py-2 text-[12px] transition-colors hover:text-slate-300"
              style={{ color: '#64748b' }}
            >
              بیشتر
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
