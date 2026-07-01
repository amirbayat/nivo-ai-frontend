import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useTicketDetail, useAddTicketReply } from '@/queries/ticket.queries'
import { fa } from '@/locales/fa'
import type { Ticket } from '@/types/api'

type Status = Ticket['status']

function statusBadge(status: Status) {
  const map: Record<Status, { label: string; cls: string }> = {
    OPEN: { label: fa.ticket.status.OPEN, cls: 'bg-blue-500/15 text-blue-400' },
    IN_PROGRESS: { label: fa.ticket.status.IN_PROGRESS, cls: 'bg-amber-500/15 text-amber-400' },
    RESOLVED: { label: fa.ticket.status.RESOLVED, cls: 'bg-emerald-500/15 text-emerald-400' },
    CLOSED: { label: fa.ticket.status.CLOSED, cls: 'bg-slate-500/15 text-slate-400' },
  }
  const { label, cls } = map[status]
  return (
    <span className={clsx('rounded-lg px-2.5 py-1 text-xs font-medium', cls)}>{label}</span>
  )
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: ticket, isLoading } = useTicketDetail(id ?? '')
  const addReply = useAddTicketReply(id ?? '')

  const [replyBody, setReplyBody] = useState('')

  function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!replyBody.trim()) return
    addReply.mutate(
      { body: replyBody.trim() },
      {
        onSuccess: () => setReplyBody(''),
      },
    )
  }

  const isClosed = ticket?.status === 'CLOSED'

  return (
    <div className="space-y-5">
      {/* back button */}
      <button
        onClick={() => navigate('/settings/tickets')}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 rotate-180">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        {fa.ticket.backToList}
      </button>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-sm text-slate-400">
          {fa.common.loading}
        </div>
      ) : !ticket ? (
        <div className="flex items-center justify-center py-12 text-sm text-slate-400">
          {fa.common.error}
        </div>
      ) : (
        <>
          {/* ticket header */}
          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-100">{ticket.subject}</h2>
              {statusBadge(ticket.status)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {new Date(ticket.createdAt).toLocaleDateString('fa-IR')}
            </p>
          </div>

          {/* admin note */}
          {ticket.adminNote && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <p className="text-xs font-medium text-amber-400 mb-1">یادداشت پشتیبانی</p>
              <p className="text-sm text-amber-300">{ticket.adminNote}</p>
            </div>
          )}

          {/* conversation */}
          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
            <div className="divide-y divide-slate-700/40">
              {/* original message */}
              <div className="flex justify-end p-4">
                <div className="max-w-[80%]">
                  <p className="text-xs text-slate-500 mb-1.5 text-right">{fa.ticket.yourMessage}</p>
                  <div className="rounded-2xl rounded-tr-sm bg-emerald-500/15 px-4 py-3 text-sm text-slate-200">
                    {ticket.body}
                  </div>
                </div>
              </div>

              {/* replies */}
              {ticket.replies.map(reply => (
                <div
                  key={reply.id}
                  className={clsx('flex p-4', reply.fromAdmin ? 'justify-start' : 'justify-end')}
                >
                  <div className="max-w-[80%]">
                    <p className={clsx('text-xs text-slate-500 mb-1.5', reply.fromAdmin ? 'text-left' : 'text-right')}>
                      {reply.fromAdmin ? fa.ticket.adminReply : fa.ticket.yourMessage}
                      {' · '}
                      {new Date(reply.createdAt).toLocaleDateString('fa-IR')}
                    </p>
                    <div
                      className={clsx(
                        'rounded-2xl px-4 py-3 text-sm text-slate-200',
                        reply.fromAdmin
                          ? 'rounded-tl-sm bg-slate-700/50'
                          : 'rounded-tr-sm bg-emerald-500/15',
                      )}
                    >
                      {reply.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* reply form */}
          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5">
            <form onSubmit={handleReply} className="space-y-3">
              <textarea
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                disabled={isClosed}
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors disabled:opacity-40"
                placeholder={isClosed ? fa.ticket.status.CLOSED : fa.ticket.reply}
              />
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isClosed || addReply.isPending || !replyBody.trim()}
                  className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-400 disabled:opacity-50 transition-colors"
                >
                  {addReply.isPending ? fa.common.loading : fa.ticket.sendReply}
                </button>
                {addReply.isError && (
                  <span className="text-sm text-red-400">{fa.common.error}</span>
                )}
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
