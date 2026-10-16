// docs/PRD-buyer-chat-redesign.md §6.4.2 — پاسخ‌های سریع آخرین پیام ایجنت، ردیف افقی چیپ درست بالای نوار پرسش
// (نه داخل نخ)؛ کلیک = همان مسیر تایپ‌کردن. با شروع ارسال ردیف پنهان می‌شود (parent). عمداً بدون آیکون جهت‌دار
export function QuickRepliesBar({
  replies,
  disabled,
  onPick,
}: {
  replies: string[]
  disabled: boolean
  onPick: (text: string) => void
}) {
  if (replies.length === 0) return null
  return (
    <div className="flex gap-2 overflow-x-auto px-3 pb-1 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {replies.map((label) => (
        <button
          key={label}
          type="button"
          onClick={() => onPick(label)}
          disabled={disabled}
          className="min-h-11 shrink-0 whitespace-nowrap rounded-full border border-[var(--shop-border)] bg-[var(--shop-surface)] px-4 text-sm text-[var(--shop-text)] disabled:opacity-40"
        >
          {label}
        </button>
      ))}
    </div>
  )
}
