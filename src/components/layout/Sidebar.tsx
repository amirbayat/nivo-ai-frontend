import { useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import {
  useConversations,
  useArchiveConversation,
} from "@/queries/conversation.queries";
import { useMe } from "@/queries/auth.queries";
import { useWallet } from "@/queries/usage.queries";
import { useChatStore } from "@/store/chat.store";
import { PlanUpgradeBadge } from "./PlanUpgradeBadge";
import { fa } from "@/locales/fa";
import logoUrl from "@/assets/brand/horizontal-dark.svg";

// اسم کاربر فقط یک فیلد ترکیبی است (نه firstName/lastName جدا) — با split روی فاصله
// حرف اول کلمه‌ی اول و حرف اول کلمه‌ی آخر را می‌گیریم؛ بدون نام، دایره خالی می‌ماند
function avatarInitials(name?: string | null): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].charAt(0);
  return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const navigate = useNavigate();
  const { selectedConvId, setSelectedConvId } = useChatStore();
  const { data: me } = useMe();
  const isPayAsYouGo = Boolean(me?.plan?.isPayAsYouGo);
  const { data: wallet } = useWallet(isPayAsYouGo);
  const { data, fetchNextPage, hasNextPage } = useConversations();
  const archiveMut = useArchiveConversation();

  const conversations = data?.pages.flatMap((p) => p.items) ?? [];

  const handleSelect = (id: string) => {
    setSelectedConvId(id);
    navigate(`/chat/${id}`);
    onNavigate?.();
  };

  const handleNew = () => {
    setSelectedConvId(null);
    navigate("/chat");
    onNavigate?.();
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-l border-slate-700/50 bg-slate-900">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <img
            src={logoUrl}
            alt="نیوو"
            className="w-28 h-auto"
          />
        </div>
        <button
          onClick={handleNew}
          className="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700/60 hover:text-emerald-400 transition-colors"
          title={fa.chat.newChat}
        >
          <svg viewBox="0 0 24 24" fill="none" className="size-4">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="px-4 py-3 border-b border-slate-700/50">
        <PlanUpgradeBadge />
      </div>

      {/* conversations */}
      <div className="flex-1 overflow-y-auto py-2">
        {conversations.length === 0 && (
          <p className="px-4 py-8 text-center text-xs text-slate-600">
            {fa.chat.noHistory}
          </p>
        )}
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => handleSelect(conv.id)}
            className={clsx(
              "group relative mx-2 rounded-xl px-3 py-2.5 cursor-pointer transition-colors",
              selectedConvId === conv.id
                ? "bg-emerald-500/15 text-emerald-300"
                : "text-slate-400 hover:bg-slate-700/40 hover:text-slate-200",
            )}
          >
            <p className="truncate text-sm leading-tight">
              {conv.title ?? fa.chat.untitled}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              {new Date(conv.lastMessageAt).toLocaleDateString("fa-IR")}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                archiveMut.mutate(conv.id);
                if (selectedConvId === conv.id) {
                  setSelectedConvId(null);
                  navigate("/chat");
                }
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 size-6 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center text-slate-500 hover:text-red-400 transition-all"
            >
              <svg viewBox="0 0 24 24" fill="none" className="size-3.5">
                <path
                  d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        ))}
        {hasNextPage && (
          <button
            onClick={() => void fetchNextPage()}
            className="w-full py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            بیشتر
          </button>
        )}
      </div>

      {/* footer */}
      <div className="border-t border-slate-700/50 p-3">
        <button
          onClick={() => navigate("/settings/profile")}
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-slate-700/50 transition-colors text-right"
        >
          <div className="size-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300 shrink-0">
            {avatarInitials(me?.name)}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs font-medium text-slate-200">
              {me?.name ?? me?.phone}
            </span>
            <span className="text-[10px] text-slate-500">
              {fa.settings.viewProfile}
            </span>
          </div>
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-4 shrink-0 text-slate-500"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {isPayAsYouGo && (
          <button
            onClick={() => navigate("/settings/wallet")}
            className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-slate-700/50 transition-colors text-right"
          >
            <div className="size-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
              <svg viewBox="0 0 20 20" fill="none" className="size-4">
                <path
                  d="M3 6.5A1.5 1.5 0 014.5 5h11A1.5 1.5 0 0117 6.5v7a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 13.5v-7z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path d="M3 8.5h14" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="13.5" cy="11.5" r="1" fill="currentColor" />
              </svg>
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs font-medium text-slate-200">
                {fa.settings.wallet}
              </span>
              <span className="text-[10px] text-emerald-400/80" dir="ltr">
                {(wallet?.balanceToman ?? 0).toLocaleString("fa-IR")} تومان
              </span>
            </div>
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-4 shrink-0 text-slate-500"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </aside>
  );
}
