import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

// docs/PRD-image-prompt-coach.md — «بررسی پرامپت» استودیوی عکس. stateless روی سرور، رایگان
// (بدون کسر کیف‌پول)، کل تاریخچه‌ی مودال هر بار از کلاینت فرستاده می‌شود. برخلاف
// videoEdit.queries.ts/useVideoPromptReview (که رفرنس را با {type, key} می‌فرستد)، اینجا
// referenceImages مستقیم آرایه‌ی data URL خام است — همون چیزی که استودیوی عکس همین حالا در
// state نگه می‌دارد، بدون نیاز به آپلود/کلید MinIO
export function useImagePromptReview() {
  return useMutation({
    mutationFn: (payload: {
      referenceImages?: string[]
      messages: { role: 'user' | 'assistant'; content: string }[]
    }) =>
      api.post<{ critique: string; suggestedPrompt: string | null }>('/chat/prompt-review', payload).then(r => r.data),
  })
}
