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
import { track } from "@/lib/events";
import logoUrl from "@/assets/brand/horizontal-dark.svg";

// گروه‌بندی لیست مکالمه‌ها بر اساس تاریخ (امروز/دیروز/۷ روز گذشته/قدیمی‌تر) — فقط چیدمان
// بصری لیست موجود است، هیچ کوئری/داده‌ی جدیدی لازم ندارد چون lastMessageAt از قبل می‌آید
const DAY_MS = 86_400_000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function groupConversationsByDate<T extends { lastMessageAt: string }>(
  items: T[],
): Array<{ label: string; items: T[] }> {
  const today = startOfDay(new Date());
  const buckets: Record<string, T[]> = {
    امروز: [],
    دیروز: [],
    "۷ روز گذشته": [],
    قدیمی‌تر: [],
  };
  for (const item of items) {
    const diffDays = (today - startOfDay(new Date(item.lastMessageAt))) / DAY_MS;
    if (diffDays <= 0) buckets["امروز"].push(item);
    else if (diffDays === 1) buckets["دیروز"].push(item);
    else if (diffDays <= 7) buckets["۷ روز گذشته"].push(item);
    else buckets["قدیمی‌تر"].push(item);
  }
  return Object.entries(buckets)
    .filter(([, list]) => list.length > 0)
    .map(([label, list]) => ({ label, items: list }));
}

// توی گروه «امروز» ساعت دقیق‌تر و مفیدتر از تکرار خودِ «امروز» است؛ بقیه‌ی گروه‌ها همون
// تاریخ کامل قبلی را نگه می‌دارند
function conversationDateLabel(iso: string): string {
  const d = new Date(iso);
  if (startOfDay(d) === startOfDay(new Date())) {
    return d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("fa-IR");
}

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
    track("conversation_opened", { conversationId: id });
    setSelectedConvId(id);
    navigate(`/chat/${id}`);
    onNavigate?.();
  };

  const handleNew = () => {
    track("new_chat_started");
    setSelectedConvId(null);
    navigate("/chat");
    onNavigate?.();
  };

  return (
    <aside
      className="flex h-full w-72 shrink-0 flex-col border-l border-slate-700/30"
      style={{ background: 'linear-gradient(180deg, #0a0f1c 0%, #0f172a 100%)' }}
    >
      {/* header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700/30">
        <div className="flex items-center gap-2">
          <img
            src={logoUrl}
            alt="نیوو"
            className="w-28 h-auto"
          />
        </div>
        <button
          onClick={handleNew}
          className="size-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-700/50 hover:text-emerald-400 transition-colors"
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

      <div className="px-4 py-3 border-b border-slate-700/30">
        <PlanUpgradeBadge />
      </div>

      <div className="px-4 py-3 border-b border-slate-700/30">
        <div className="flex gap-2">
          <button
            onClick={() => { track("projects_nav_clicked"); navigate("/projects"); onNavigate?.(); }}
            className="flex-1 rounded-xl border border-slate-700/60 px-2.5 py-2 text-xs text-slate-400 hover:border-slate-600 hover:bg-slate-800/40 hover:text-slate-200 transition-colors"
          >
            {fa.projects.title}
          </button>
          <button
            onClick={() => { track("gallery_nav_clicked"); navigate("/gallery"); onNavigate?.(); }}
            className="flex-1 rounded-xl border border-slate-700/60 px-2.5 py-2 text-xs text-slate-400 hover:border-slate-600 hover:bg-slate-800/40 hover:text-slate-200 transition-colors"
          >
            {fa.gallery.title}
          </button>
          <a
            href="https://cal.nivoai.ir"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { track("nivo_cal_nav_clicked"); onNavigate?.(); }}
            className="flex-1 rounded-xl border border-slate-700/60 px-2.5 py-2 text-center text-xs text-slate-400 hover:border-slate-600 hover:bg-slate-800/40 hover:text-slate-200 transition-colors"
          >
            {fa.nivoCal.navLabel}
          </a>
        </div>
      </div>

      {/* conversations */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {conversations.length === 0 && (
          <p className="px-4 py-8 text-center text-xs text-slate-600">
            {fa.chat.noHistory}
          </p>
        )}
        {groupConversationsByDate(conversations).map((group) => (
          <div key={group.label} className="mb-1">
            <p className="mb-1 mt-3 px-2 text-[11px] font-bold tracking-wide text-slate-600 first:mt-1">
              {group.label}
            </p>
            {group.items.map((conv) => {
              const active = selectedConvId === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelect(conv.id)}
                  className={clsx(
                    "group relative rounded-xl px-3 py-2.5 cursor-pointer transition-colors",
                    active
                      ? "bg-emerald-500/10"
                      : "hover:bg-slate-700/40",
                  )}
                >
                  {active && (
                    <span className="absolute inset-y-2 right-0 w-[3px] rounded-full bg-emerald-500" />
                  )}
                  <p
                    className={clsx(
                      "truncate text-[13px] font-medium leading-tight",
                      active ? "text-emerald-100" : "text-slate-300",
                    )}
                  >
                    {conv.title ?? fa.chat.untitled}
                  </p>
                  <p
                    className={clsx(
                      "mt-1 text-[11px]",
                      active ? "text-emerald-400/80" : "text-slate-600",
                    )}
                  >
                    {conversationDateLabel(conv.lastMessageAt)}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      archiveMut.mutate(conv.id, {
                        onSuccess: () =>
                          track("conversation_archived", { conversationId: conv.id }),
                      });
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
              );
            })}
          </div>
        ))}
        {hasNextPage && (
          <button
            onClick={() => {
              track("conversation_list_paginated");
              void fetchNextPage();
            }}
            className="w-full py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            بیشتر
          </button>
        )}
      </div>

      {/* footer */}
      <div className="border-t border-slate-700/30 p-3">
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
            {/* chevron-left — این یک لینک روبه‌جلو (رفتن به صفحه‌ی پروفایل) است، نه بازگشت */}
            <path
              fillRule="evenodd"
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
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
