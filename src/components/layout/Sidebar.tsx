import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useConversations, useArchiveConversation } from '@/queries/conversation.queries'
import { useMe, useLogout } from '@/queries/auth.queries'
import { useChatStore } from '@/store/chat.store'
import { fa } from '@/locales/fa'

export function Sidebar() {
  const navigate = useNavigate()
  const { selectedConvId, setSelectedConvId } = useChatStore()
  const { data: me } = useMe()
  const { data, fetchNextPage, hasNextPage } = useConversations()
  const archiveMut = useArchiveConversation()
  const logoutMut = useLogout()

  const conversations = data?.pages.flatMap(p => p.items) ?? []

  const handleSelect = (id: string) => {
    setSelectedConvId(id)
    navigate(`/chat/${id}`)
  }

  const handleNew = () => {
    setSelectedConvId(null)
    navigate('/chat')
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-l border-slate-700/50 bg-slate-900">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700/50">
        <span className="text-sm font-semibold text-emerald-400">دستیار هوش مصنوعی</span>
        <button
          onClick={handleNew}
          className="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700/60 hover:text-emerald-400 transition-colors"
          title={fa.chat.newChat}
        >
          <svg viewBox="0 0 24 24" fill="none" className="size-4">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* conversations */}
      <div className="flex-1 overflow-y-auto py-2">
        {conversations.length === 0 && (
          <p className="px-4 py-8 text-center text-xs text-slate-600">{fa.chat.noHistory}</p>
        )}
        {conversations.map(conv => (
          <div
            key={conv.id}
            onClick={() => handleSelect(conv.id)}
            className={clsx(
              'group relative mx-2 rounded-xl px-3 py-2.5 cursor-pointer transition-colors',
              selectedConvId === conv.id
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'text-slate-400 hover:bg-slate-700/40 hover:text-slate-200',
            )}
          >
            <p className="truncate text-sm leading-tight">
              {conv.title ?? fa.chat.untitled}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              {new Date(conv.lastMessageAt).toLocaleDateString('fa-IR')}
            </p>
            <button
              onClick={e => {
                e.stopPropagation()
                archiveMut.mutate(conv.id)
                if (selectedConvId === conv.id) {
                  setSelectedConvId(null)
                  navigate('/chat')
                }
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 size-6 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center text-slate-500 hover:text-red-400 transition-all"
            >
              <svg viewBox="0 0 24 24" fill="none" className="size-3.5">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
        {hasNextPage && (
          <button
            onClick={() => void fetchNextPage()}
            className="w-full py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            بیشتر
          </button>
        )}
      </div>

      {/* footer */}
      <div className="border-t border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate('/settings/profile')}
            className="flex items-center gap-2 rounded-xl px-1 py-1 hover:bg-slate-700/50 transition-colors text-right"
            title={fa.settings.profile}
          >
            <div className="size-7 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300">
              {me?.phone?.slice(-4) ?? '?'}
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-300">{me?.name ?? me?.phone}</span>
              <span className="text-[10px] text-slate-600">
                {me?.subscription?.plan?.name ?? fa.plans.free}
              </span>
            </div>
          </button>
          <button
            onClick={() => logoutMut.mutate()}
            className="size-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-700/60 transition-colors"
            title={fa.nav.logout}
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-4">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
