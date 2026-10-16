import { BottomSheet } from '@/components/ui/BottomSheet'

interface ConfirmDialogProps {
  open: boolean
  title?: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

// docs/PRD-buyer-chat-redesign.md §5 — جایگزین confirm()/alert() بومی (داخل مرورگرهای درون‌برنامه‌ای
// اینستاگرام/تلگرام مسدود یا زشت‌اند). روی BottomSheet ساخته شده؛ بازگشت (back) هم آن را می‌بندد
export function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onCancel}
      title={title}
      closeOnBack
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-xl border border-[var(--shop-border)] text-sm font-semibold text-[var(--shop-text)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 flex-1 rounded-xl bg-[var(--shop-accent-fill)] text-sm font-bold text-[var(--shop-accent-text)]"
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p className="py-2 text-[15px] leading-7 text-[var(--shop-text)]">{message}</p>
    </BottomSheet>
  )
}
