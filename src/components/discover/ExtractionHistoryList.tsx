import { useExtractionHistory } from "@/queries/discovery.queries";
import { useAuthedImageUrl } from "@/hooks/useAuthedImageUrl";
import { fa } from "@/locales/fa";
import type { CreativePromptCatalogItem, ExtractionHistoryItem } from "@/types/api";

interface ExtractionHistoryListProps {
  onUsePrompt: (item: CreativePromptCatalogItem) => void;
}

// نوار افقی تاریخچه‌ی «تبدیل عکس به پرامپت» — زیر PromptExtractionCard، قبل از دسته‌بندی‌ها.
// هر آیتم دقیقاً همون CreativePromptCatalogItem را به onUsePrompt می‌دهد (همون هندلر انتخاب
// سبک در DiscoverPage) تا استفاده‌ی دوباره از یک استخراج قبلی، عیناً مثل کاتالوگ کار کند.
export function ExtractionHistoryList({ onUsePrompt }: ExtractionHistoryListProps) {
  const { data: history, isLoading } = useExtractionHistory();

  if (isLoading || !history?.length) return null;

  return (
    <div className="mb-8">
      <h3 className="mb-3 text-sm font-semibold text-slate-300">{fa.discover.extractPrompt.historyTitle}</h3>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {history.map(item => (
          <HistoryItemCard key={item.id} item={item} onUsePrompt={onUsePrompt} />
        ))}
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
}: {
  item: ExtractionHistoryItem;
  onUsePrompt: (item: CreativePromptCatalogItem) => void;
}) {
  const imgUrl = useAuthedImageUrl(item.exampleImageUrl ?? "");
  // یک استخراج REJECTED‌شده دیگر حتی برای خودِ کاربر هم قابل‌استفاده نیست (همون قانون
  // usableByOwner در discovery-generation.service.ts generate())
  const usable = item.reviewStatus !== "REJECTED";

  return (
    <div className="flex w-56 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/40">
      <div className="relative h-32 w-full bg-slate-900">
        {imgUrl && <img src={imgUrl} alt="" className="h-full w-full object-cover" />}
        <span
          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] ${statusClass(item.reviewStatus)}`}
        >
          {statusLabel(item.reviewStatus)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
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
