import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import type { Ticket, TicketDetail } from '@/types/api'

export function useTickets() {
  return useQuery({
    queryKey: keys.tickets.list(),
    queryFn: () =>
      api.get<{ tickets: Ticket[] }>('/tickets').then(r => r.data.tickets),
  })
}

export function useTicketDetail(id: string) {
  return useQuery({
    queryKey: keys.tickets.detail(id),
    queryFn: () =>
      api.get<{ ticket: TicketDetail }>(`/tickets/${id}`).then(r => r.data.ticket),
    enabled: !!id,
  })
}

export function useCreateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { subject: string; body: string; priority?: string }) =>
      api.post<Ticket>('/tickets', data).then(r => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.tickets.list() })
    },
  })
}

export function useAddTicketReply(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { body: string }) =>
      api.post(`/tickets/${id}/reply`, data).then(r => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.tickets.detail(id) })
    },
  })
}
