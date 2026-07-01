import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useTickets, useCreateTicket } from '@/queries/ticket.queries'
import { fa } from '@/locales/fa'
import type { Ticket } from '@/types/api'

type Status = Ticket['status']
type Priority = Ticket['priority']

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

function priorityBadge(priority: Priority) {
  const map: Record<Priority, { label: string; cls: string }> = {
    LOW: { label: fa.ticket.priority.LOW, cls: 'text-slate-400' },
    NORMAL: { label: fa.ticket.priority.NORMAL, cls: 'text-slate-300' },
    HIGH: { label: fa.ticket.priority.HIGH, cls: 'text-amber-400' },
    URGENT: { label: fa.ticket.priority.URGENT, cls: 'text-red-400' },
  }
  const { label, cls } = map[priority]
  return <span className={clsx('text-xs font-medium', cls)}>{label}</span>
}

export function TicketsPage() {
  const navigate = useNavigate()
  const { data: tickets, isLoading } = useTickets()
  const createTicket = useCreateTicket()

  const [showForm, setShowForm] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) return
    createTicket.mutate(
      { subject: subject.trim(), body: body.trim() },
      {
        onSuccess: () => {
          setSubject('')
          setBody('')
          setShowForm(false)
          setSubmitted(true)
          setTimeout(() => setSubmitted(false), 3000)
        },
      },
    )
  }

  return (
    <div className="space-y-5">
      {/* header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-100">{fa.settings.tickets}</h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className="rounded-xl bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/25 transition-colors"
        >
          {fa.settings.newTicket}
        </button>
      </div>

      {submitted && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {fa.ticket.created}
        </div>
      )}

      {/* new ticket form */}
      {showForm && (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">{fa.ticket.subject}</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                placeholder={fa.ticket.subject}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">{fa.ticket.body}</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                required
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                placeholder={fa.ticket.body}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={createTicket.isPending}
                className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-400 disabled:opacity-50 transition-colors"
              >
                {createTicket.isPending ? fa.common.loading : fa.ticket.submit}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                {fa.common.cancel}
              </button>
              {createTicket.isError && (
                <span className="text-sm text-red-400">{fa.common.error}</span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ticket list */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-400">
            {fa.common.loading}
          </div>
        ) : !tickets || tickets.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-400">
            {fa.ticket.noTickets}
          </div>
        ) : (
          <div className="divide-y divide-slate-700/40">
            {tickets.map(ticket => (
              <button
                key={ticket.id}
                onClick={() => navigate(`/settings/tickets/${ticket.id}`)}
                className="w-full flex items-center justify-between px-5 py-4 text-right hover:bg-slate-700/20 transition-colors"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-sm font-medium text-slate-200 truncate">{ticket.subject}</span>
                  <div className="flex items-center gap-2">
                    {priorityBadge(ticket.priority)}
                    <span className="text-xs text-slate-500">
                      {new Date(ticket.createdAt).toLocaleDateString('fa-IR')}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 mr-3">
                  {statusBadge(ticket.status)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
