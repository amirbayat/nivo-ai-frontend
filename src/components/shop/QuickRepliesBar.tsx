// docs/PRD-sales-agent-sales-state-machine.md §۱۲.۲ — دکمه‌های پاسخ سریع زیر «آخرین» پیام agent؛
// کلیک = همان مسیر تایپ‌کردن (متن در تاریخچه به‌عنوان پیام مشتری دیده می‌شود). سبک چیپ‌ها عیناً
// VariantPromptBlock است. عمداً بدون آیکون جهت‌دار (سایت RTL است)
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
    <div className="mt-2 flex flex-wrap gap-2">
      {replies.map(label => (
        <button
          key={label}
          type="button"
          onClick={() => onPick(label)}
          disabled={disabled}
          className="rounded-xl border border-slate-600/60 bg-slate-800/60 light:border-slate-200 light:bg-white px-3 py-2 text-center text-xs text-slate-200 light:text-slate-900 hover:border-slate-500 light:hover:border-slate-400 disabled:opacity-40"
        >
          {label}
        </button>
      ))}
    </div>
  )
}
