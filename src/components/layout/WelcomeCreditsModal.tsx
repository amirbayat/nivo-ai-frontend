import { useEffect, useState } from "react";
import { fa } from "@/locales/fa";

const STORAGE_KEY = "nivo:signupBonusCredits";

// فقط دقیقاً یک‌بار نمایش داده می‌شود — بلافاصله بعد از اولین ثبت‌نام واقعی (نه هر لاگین).
// OtpPage.tsx مقدار را توی sessionStorage می‌ذاره، این کامپوننت (توی ChatLayout mount شده)
// همون یک‌بار می‌خونه و فوراً پاک می‌کنه — رفرش/بازگشت بعدی هرگز دوباره نشون نمی‌ده.
export function WelcomeCreditsModal() {
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      sessionStorage.removeItem(STORAGE_KEY);
      const n = Number(raw);
      if (n > 0) setCredits(n);
    }
  }, []);

  if (!credits) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
      onClick={() => setCredits(null)}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-emerald-500/30 bg-slate-900 p-7 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/15">
          <svg viewBox="0 0 24 24" fill="none" className="size-7 text-emerald-400">
            <path
              d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2z"
              fill="currentColor"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-bold text-slate-100">{fa.credits.welcomeTitle}</h3>
        <p className="mb-6 text-sm leading-relaxed text-slate-400">
          {fa.credits.welcomeMessage(credits)}
        </p>
        <button
          onClick={() => setCredits(null)}
          className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-400 active:scale-[0.98] transition-all"
        >
          {fa.credits.welcomeCta}
        </button>
      </div>
    </div>
  );
}
