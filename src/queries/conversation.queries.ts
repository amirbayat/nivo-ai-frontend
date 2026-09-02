import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import { track } from '@/lib/events'
import type { Conversation, ConversationDetail, ConversationsPage } from '@/types/api'

export function useConversations(projectId?: string) {
  return useInfiniteQuery({
    queryKey: keys.conv.list(projectId),
    queryFn: ({ pageParam }) =>
      api.get<ConversationsPage>('/conversations', {
        params: { cursor: pageParam, limit: 20, ...(projectId ? { projectId } : {}) },
      }).then(r => r.data),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: last => last.nextCursor ?? undefined,
  })
}

// docs/PRD-openrouter-migration.md §۱۴.۴/۱۴.۵ — ImageStudioHistory: همان endpoint لیست
// گفتگوها، فقط فیلترشده به گفتگوهایی که حداقل یک عکس تولید کرده‌اند (imageGenCount > 0)
export function useImageStudioConversations() {
  return useInfiniteQuery({
    queryKey: keys.conv.imageGenList(),
    queryFn: ({ pageParam }) =>
      api.get<ConversationsPage>('/conversations', {
        params: { cursor: pageParam, limit: 20, imageGenOnly: true },
      }).then(r => r.data),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: last => last.nextCursor ?? undefined,
  })
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: keys.conv.detail(id),
    queryFn: () => api.get<ConversationDetail>(`/conversations/${id}`).then(r => r.data),
    enabled: !!id,
  })
}

export function useCreateConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ model, projectId }: { model: string; projectId?: string }) =>
      api.post<Conversation>('/conversations', { model, ...(projectId ? { projectId } : {}) }).then(r => r.data),
    onSuccess: (_data, { model, projectId }) => {
      track('conversation_created', { model, projectId })
      void qc.invalidateQueries({ queryKey: keys.conv.list() })
      if (projectId) void qc.invalidateQueries({ queryKey: keys.conv.list(projectId) })
    },
  })
}

export function useUpdateConversation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title?: string; systemPrompt?: string }) =>
      api.patch<{ conversation: Conversation }>(`/conversations/${id}`, data).then(r => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.conv.detail(id) })
      void qc.invalidateQueries({ queryKey: keys.conv.list() })
    },
  })
}

export function useArchiveConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/conversations/${id}`).then(r => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.conv.list() })
    },
  })
}
