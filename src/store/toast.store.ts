import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
}

interface ToastState {
  toasts: Toast[]
  addToast: (message: string, durationMs?: number) => void
  removeToast: (id: number) => void
}

let nextId = 0

// وقتی چند درخواست همزمان (مثلاً بار اولیه‌ی اپ: پروفایل + مکالمات + اعتبار) با هم به rate
// limit می‌خورند، هرکدام جدا از api.ts آدرس addToast را صدا می‌زنند — بدون این محافظت، همون
// پیام تکراری N بار روی هم روی صفحه تلنبار می‌شود. اگر همون پیام همین الان روی صفحه‌ست،
// دوباره اضافه‌اش نمی‌کنیم.
const DUPLICATE_WINDOW_MS = 4000
const recentMessages = new Map<string, number>()

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  addToast: (message, durationMs = 6000) => {
    const now = Date.now()
    const lastShownAt = recentMessages.get(message)
    if (lastShownAt !== undefined && now - lastShownAt < DUPLICATE_WINDOW_MS) return
    recentMessages.set(message, now)

    const id = nextId++
    set(s => ({ toasts: [...s.toasts, { id, message }] }))
    setTimeout(() => {
      get().removeToast(id)
      // فقط اگر از اون موقع پیام جدیدتری با همین متن ثبت نشده پاکش کن — وگرنه یک toast بعدی
      // که همین الان به تازگی نشون داده شده رو زودتر از موعد از حالت «تکراری» خارج می‌کنیم
      if (recentMessages.get(message) === now) recentMessages.delete(message)
    }, durationMs)
  },
  removeToast: id => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))
