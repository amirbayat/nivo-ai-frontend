import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import { useDiscoveryCatalog, useDiscoveryCategories, type DiscoverySort } from "@/queries/discovery.queries";
import { useCreateConversation } from "@/queries/conversation.queries";
import { useChatStore } from "@/store/chat.store";
import { PromptMasonryGrid } from "@/components/discover/PromptMasonryGrid";
import { PromptExtractionCard } from "@/components/discover/PromptExtractionCard";
import { fa } from "@/locales/fa";
import type { CreativePromptCatalogItem, CreativeCategory } from "@/types/api";

type FilterValue = "ALL" | "IMAGE" | "TEXT";

interface CategoryNode extends CreativeCategory {
  children: CategoryNode[];
}

function buildCategoryTree(categories: CreativeCategory[]): CategoryNode[] {
  const byParent = new Map<string | null, CreativeCategory[]>();
  for (const c of categories) {
    const list = byParent.get(c.parentId) ?? [];
    list.push(c);
    byParent.set(c.parentId, list);
  }
  function attach(parentId: string | null): CategoryNode[] {
    return (byParent.get(parentId) ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({ ...c, children: attach(c.id) }));
  }
  return attach(null);
}

export function DiscoverPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterValue>("ALL");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<DiscoverySort>("sortOrder");
  const { data: categories } = useDiscoveryCategories();
  const { data: catalog, isLoading } = useDiscoveryCatalog({
    outputType: filter === "ALL" ? undefined : filter,
    categoryId,
    sort,
  });
  const setSelectedCreativePrompt = useChatStore((s) => s.setSelectedCreativePrompt);
  const createConversation = useCreateConversation();

  const categoryTree = useMemo(() => buildCategoryTree(categories ?? []), [categories]);

  // انتخاب یک کارت → مستقیم برگشت به چت با همون سبک به‌عنوان context؛ دیگر مودال جدا
  // (GenerateModal قدیمی) وسط راه نمی‌آید — «وقتی یک کارت رو انتخاب میکنه برگرده به چت،
  // اما اون context انتخاب شده باشه» (پیام کاربر). یک مکالمه‌ی تازه می‌سازیم تا کارت‌های نتیجه
  // بالای اینپوت همون چت (MessageInput/MessageList) نمایش داده شوند.
  // کاربر مهمان (بدون access_token) پروژه/مکالمه‌ی واقعی ندارد — به‌جای POST /conversations
  // (که ۴۰۱ می‌گیرد)، فقط سبک انتخابی را در همون استور مشترک می‌گذاریم و به تجربه‌ی چت مهمان
  // در "/" برمی‌گردیم؛ AnonChatPage با دیدن selectedCreativePrompt پنل امتحان رایگان را نشان می‌دهد.
  function handleSelectPrompt(item: CreativePromptCatalogItem) {
    setSelectedCreativePrompt(item);
    const hasToken = !!localStorage.getItem("access_token");
    if (!hasToken) {
      navigate("/");
      return;
    }
    createConversation.mutate({ model: "optimal" }, {
      onSuccess: (conv) => navigate(`/chat/${conv.id}`),
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8" dir="rtl">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-colors"
            aria-label={fa.common.back}
          >
            {/* chevron-right — دکمه‌ی «بازگشت» در RTL باید رو به راست اشاره کند (CLAUDE.md) */}
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">{fa.discover.title}</h1>
            <p className="mt-0.5 text-sm text-slate-500">{fa.discover.subtitle}</p>
          </div>
        </div>

        <PromptExtractionCard onUsePrompt={handleSelectPrompt} />

        <div className="flex flex-col gap-6 md:flex-row">
          {/* سایدبار دسته‌بندی — سمت راست (اولین فرزند در RTL) */}
          <aside className="shrink-0 md:w-56">
            <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-3">
              <button
                onClick={() => setCategoryId(undefined)}
                className={clsx(
                  "w-full rounded-lg px-3 py-2 text-right text-sm transition-colors",
                  !categoryId ? "bg-emerald-500/15 text-emerald-300" : "text-slate-400 hover:bg-slate-700/40",
                )}
              >
                {fa.discover.allCategories}
              </button>
              <CategoryList nodes={categoryTree} selected={categoryId} onSelect={setCategoryId} depth={0} />
            </div>
          </aside>

          {/* محتوای اصلی */}
          <div className="min-w-0 flex-1">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 p-1">
                {(["ALL", "IMAGE", "TEXT"] as FilterValue[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={clsx(
                      "rounded-full px-4 py-1.5 text-sm transition-colors",
                      filter === f
                        ? "bg-emerald-500 text-white"
                        : "text-slate-400 hover:text-slate-200",
                    )}
                  >
                    {f === "ALL" ? fa.discover.filterAll : f === "IMAGE" ? fa.discover.filterImage : fa.discover.filterText}
                  </button>
                ))}
              </div>

              <div className="flex gap-1 rounded-full border border-slate-800 bg-slate-900/60 p-1 text-xs">
                {([
                  ["sortOrder", fa.discover.sortDefault],
                  ["newest", fa.discover.sortNewest],
                  ["cheapest", fa.discover.sortCheapest],
                  ["priciest", fa.discover.sortPriciest],
                ] as [DiscoverySort, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setSort(value)}
                    className={clsx(
                      "rounded-full px-3 py-1.5 transition-colors",
                      sort === value
                        ? "bg-slate-700 text-slate-100 shadow-sm"
                        : "text-slate-500 hover:text-slate-300",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="size-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              </div>
            ) : !catalog?.length ? (
              <p className="py-16 text-center text-sm text-slate-600">{fa.discover.empty}</p>
            ) : (
              <PromptMasonryGrid
                items={catalog}
                onSelect={handleSelectPrompt}
                disabled={createConversation.isPending}
                columns="columns-2 sm:columns-2 lg:columns-3"
              />
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

function CategoryList({
  nodes,
  selected,
  onSelect,
  depth,
}: {
  nodes: CategoryNode[];
  selected?: string;
  onSelect: (id: string) => void;
  depth: number;
}) {
  if (!nodes.length) return null;
  return (
    <div className="mt-0.5">
      {nodes.map((node) => (
        <div key={node.id}>
          <button
            onClick={() => onSelect(node.id)}
            style={{ paddingRight: `${12 + depth * 14}px` }}
            className={clsx(
              "w-full rounded-lg py-2 text-right text-sm transition-colors",
              selected === node.id ? "bg-emerald-500/15 text-emerald-300" : "text-slate-400 hover:bg-slate-700/40",
            )}
          >
            {node.name}
          </button>
          <CategoryList nodes={node.children} selected={selected} onSelect={onSelect} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}
