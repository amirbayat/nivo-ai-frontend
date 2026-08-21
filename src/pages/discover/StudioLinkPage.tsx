import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDiscoveryCatalogItem } from "@/queries/discovery.queries";
import { useCreateConversation } from "@/queries/conversation.queries";
import { useChatStore } from "@/store/chat.store";
import { fa } from "@/locales/fa";

// دیپ‌لینک عمومی یک سبک استودیو — nivoai.ir/studio?id=<promptId> — دقیقاً هم‌رفتار
// DiscoverPage.handleSelectPrompt: سبک را در استور مشترک می‌گذارد و کاربر را مستقیم به
// چت (با آن سبک از پیش‌انتخاب‌شده) یا برای مهمان به تجربه‌ی چت بدون ثبت‌نام در "/" می‌برد.
export function StudioLinkPage() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? undefined;
  const navigate = useNavigate();
  const setSelectedCreativePrompt = useChatStore((s) => s.setSelectedCreativePrompt);
  const createConversation = useCreateConversation();
  const { data: item, isError } = useDiscoveryCatalogItem(id);

  // یک‌بار برای هر id — جلوی دوباره‌ساختن مکالمه در اثر re-render/StrictMode را می‌گیرد
  const startedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!item || startedRef.current === item.id) return;
    startedRef.current = item.id;

    setSelectedCreativePrompt(item);
    const hasToken = !!localStorage.getItem("access_token");
    if (!hasToken) {
      navigate("/", { replace: true });
      return;
    }
    createConversation.mutate({ model: "optimal" }, {
      onSuccess: (conv) => navigate(`/chat/${conv.id}`, { replace: true }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  const notFound = !id || isError;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-center" dir="rtl">
      {notFound ? (
        <>
          <p className="text-sm text-slate-400">{fa.discover.studioLinkNotFound}</p>
          <a
            href="/discover"
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
          >
            {fa.discover.studioLinkBackToStudio}
          </a>
        </>
      ) : (
        <>
          <div className="size-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-500">{fa.discover.studioLinkLoading}</p>
        </>
      )}
    </div>
  );
}
