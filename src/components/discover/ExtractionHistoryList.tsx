import { useState } from "react";
import { useExtractionHistory, useRenameExtraction } from "@/queries/discovery.queries";
import { useAuthedImageUrl } from "@/hooks/useAuthedImageUrl";
import { fa } from "@/locales/fa";
import type { CreativePromptCatalogItem, ExtractionHistoryItem } from "@/types/api";

interface ExtractionHistoryListProps {
  onUsePrompt: (item: CreativePromptCatalogItem) => void;
}

const COMPACT_COUNT = 3;

// نوار افقی تاریخچه‌ی «تبدیل عکس به پرامپت» — زیر PromptExtractionCard، قبل از دسته‌بندی‌ها.
// فقط ۳ استخراج آخر نشان داده می‌شود + دکمه‌ی «مشاهده‌ی همه» که همه را توی یک مودال می‌آورد.
// هر آیتم دقیقاً همون CreativePromptCatalogItem را به onUsePrompt می‌دهد (همون هندلر انتخاب
// سبک در DiscoverPage) تا استفاده‌ی دوباره از یک استخراج قبلی، عیناً مثل کاتالوگ کار کند.
export function ExtractionHistoryList({ onUsePrompt }: ExtractionHistoryListProps) {
  const { data: history, isLoading } = useExtractionHistory();
  const [showAll, setShowAll] = useState(false);

  if (isLoading || !history?.length) return null;
  const compact = history.slice(0, COMPACT_COUNT);

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-300">{fa.discover.extractPrompt.historyTitle}</h3>
        {history.length > COMPACT_COUNT && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            {fa.discover.extractPrompt.viewAllCta}
          </button>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {compact.map(item => (
          <HistoryItemCard key={item.id} item={item} onUsePrompt={onUsePrompt} />
        ))}
      </div>

      {showAll && (
        <ViewAllModal history={history} onUsePrompt={onUsePrompt} onClose={() => setShowAll(false)} />
      )}
    </div>
  );
}

function ViewAllModal({
  history,
  onUsePrompt,
  onClose,
}: {
  history: ExtractionHistoryItem[];
  onUsePrompt: (item: CreativePromptCatalogItem) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
      aria-label={fa.discover.extractPrompt.viewAllTitle}
      onClick={onClose}
    >
      <div
        className="relative max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-slate-600 hover:text-slate-400 transition-colors"
          aria-label={fa.discover.close}
        >
          <svg viewBox="0 0 16 16" fill="none" className="size-4">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <h3 className="mb-4 text-base font-bold text-slate-100">{fa.discover.extractPrompt.viewAllTitle}</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {history.map(item => (
            <HistoryItemCard key={item.id} item={item} onUsePrompt={onUsePrompt} fullWidth />
          ))}
        </div>
      </div>
    </div>
  );
}

function statusLabel(status: ExtractionHistoryItem["reviewStatus"]): string {
  if (status === "APPROVED") return fa.discover.extractPrompt.historyStatusApproved;
  if (status === "REJECTED") return fa.discover.extractPrompt.historyStatusRejected;
  return fa.discover.extractPrompt.historyStatusPending;
}

function statusClass(status: ExtractionHistoryItem["reviewStatus"]): string {
  if (status === "APPROVED") return "bg-emerald-500/10 text-emerald-300";
  if (status === "REJECTED") return "bg-red-500/10 text-red-300";
  return "bg-amber-500/10 text-amber-300";
}

function HistoryItemCard({
  item,
  onUsePrompt,
  fullWidth,
}: {
  item: ExtractionHistoryItem;
  onUsePrompt: (item: CreativePromptCatalogItem) => void;
  fullWidth?: boolean;
}) {
  const imgUrl = useAuthedImageUrl(item.exampleImageUrl ?? "");
  const renameExtraction = useRenameExtraction();
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(item.title);
  // یک استخراج REJECTED‌شده دیگر حتی برای خودِ کاربر هم قابل‌استفاده نیست (همون قانون
  // usableByOwner در discovery-generation.service.ts generate())
  const usable = item.reviewStatus !== "REJECTED";

  function saveName() {
    const title = nameInput.trim();
    setIsEditing(false);
    if (!title || title === item.title) {
      setNameInput(item.title);
      return;
    }
    renameExtraction.mutate({ id: item.id, title });
  }

  return (
    <div
      className={
        fullWidth
          ? "flex w-full flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/40"
          : "flex w-56 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/40"
      }
    >
      <div className="relative h-32 w-full bg-slate-900">
        {imgUrl && <img src={imgUrl} alt="" className="h-full w-full object-cover" />}
        <span
          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] ${statusClass(item.reviewStatus)}`}
        >
          {statusLabel(item.reviewStatus)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        {isEditing ? (
          <input
            autoFocus
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onBlur={saveName}
            onKeyDown={e => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") { setNameInput(item.title); setIsEditing(false); }
            }}
            maxLength={60}
            className="rounded-lg border border-emerald-500/40 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1 text-right text-xs font-medium text-slate-200 hover:text-emerald-300 transition-colors"
          >
            <span className="truncate">{item.title}</span>
            <svg viewBox="0 0 16 16" fill="none" className="size-3 shrink-0 text-slate-500">
              <path d="M11 2l3 3-7.5 7.5L3 13l.5-3.5L11 2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <p className="line-clamp-2 text-xs text-slate-400">{item.extractedPrompt}</p>
        <button
          type="button"
          disabled={!usable}
          onClick={() => onUsePrompt(item)}
          className="mt-auto rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-300 transition-colors hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-600"
        >
          {fa.discover.extractPrompt.historyUseCta}
        </button>
      </div>
    </div>
  );
}
