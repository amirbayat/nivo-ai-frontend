import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { useCreditPackages, usePurchaseCreditPackage, useCreditsBalance, useCreditQuote } from "@/queries/credits.queries";
import { useEnabledGateways, type PaymentGatewayName } from "@/queries/plans.queries";
import { GatewayPickerModal } from "@/components/payment/GatewayPickerModal";
import { fa } from "@/locales/fa";
import type { CreditPackage } from "@/types/api";

// تخمین دوستانه («حدوداً چندتا عکس/پیام میشه آورد») — نه فرمول دقیق؛ creditCost همه‌ی سبک‌های
// عکس دیسکاوری یکسان ۱۶ نیوو است، و یک پیام معمولی چت حدود ۱ نیوو
const CREDITS_PER_IMAGE_ESTIMATE = 16;
const CREDITS_PER_MESSAGE_ESTIMATE = 1;

// debounce ساده‌ی مقدار — برای این‌که با هر کلیدضربه کوئری قیمت زنده نره سمت سرور
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function PricingPage() {
  const { data: packages, isLoading } = useCreditPackages();
  const { data: balance } = useCreditsBalance();
  const { data: gateways } = useEnabledGateways();
  const purchase = usePurchaseCreditPackage();

  const [customCredits, setCustomCredits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingPurchase, setPendingPurchase] = useState<{ packageId: string; customCredits?: number } | null>(null);

  const fixedPackages = packages?.filter((p) => !p.isCustomAmount) ?? [];
  const customPackage = packages?.find((p) => p.isCustomAmount);

  function doPurchase(packageId: string, customCreditsValue?: number, gateway?: PaymentGatewayName) {
    purchase.mutate(
      { packageId, customCredits: customCreditsValue, gateway },
      { onError: () => setError(fa.credits.purchaseFailed) },
    );
  }

  function handleBuy(packageId: string, customCreditsValue?: number) {
    setError(null);
    if ((gateways?.length ?? 0) > 1) {
      setPendingPurchase({ packageId, customCredits: customCreditsValue });
      return;
    }
    doPurchase(packageId, customCreditsValue, gateways?.[0]);
  }

  function handleBuyCustom() {
    if (!customPackage) return;
    const value = Number(customCredits);
    if (!value || value < customPackage.credits) {
      setError(fa.credits.minAmountError(customPackage.credits));
      return;
    }
    handleBuy(customPackage.id, value);
  }

  function handleGatewaySelect(gateway: PaymentGatewayName) {
    if (!pendingPurchase) return;
    doPurchase(pendingPurchase.packageId, pendingPurchase.customCredits, gateway);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="size-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 text-center">
          <h1 className="text-3xl font-bold text-slate-100">{fa.credits.title}</h1>
          <p className="mt-2 text-slate-500">{fa.credits.subtitle}</p>
          {balance && (
            <p className="mt-3 text-sm text-emerald-400">
              {fa.credits.currentBalance}: {balance.credits.toLocaleString("fa-IR")} {fa.credits.creditsUnit}
            </p>
          )}
        </div>

        {error && (
          <p className="mb-6 text-center text-sm text-red-400">{error}</p>
        )}

        <div className="grid gap-6 md:grid-cols-3" role="list" aria-label="بسته‌های اعتباری">
          {fixedPackages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              loading={purchase.isPending}
              onBuy={() => handleBuy(pkg.id)}
            />
          ))}
        </div>

        {customPackage && (
          <CustomAmountCard
            customPackage={customPackage}
            customCredits={customCredits}
            setCustomCredits={(v) => { setCustomCredits(v); setError(null); }}
            purchasing={purchase.isPending}
            onBuy={handleBuyCustom}
          />
        )}
      </div>

      {pendingPurchase && gateways && (
        <GatewayPickerModal
          gateways={gateways}
          loading={purchase.isPending}
          onSelect={handleGatewaySelect}
          onClose={() => setPendingPurchase(null)}
        />
      )}
    </div>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="currentColor" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2l2.6 6.6L21.5 9l-5.4 4.5L18 21l-6-3.9L6 21l1.9-7.5L2.5 9l6.9-.4L12 2z" fill="currentColor" />
    </svg>
  );
}

function DiamondIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 3l-3 6.5L12 21l9-11.5L18 3H6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M3 9.5h18M9.5 3L12 9.5 14.5 3M9 9.5L12 21l3-11.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ImageStatIcon({ className }: { className?: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="4" width="18" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" />
      <path d="M4 16.5l4.8-4.2a1.5 1.5 0 012 .06L16 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ChatStatIcon({ className }: { className?: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 5.5A2.5 2.5 0 016.5 3h11A2.5 2.5 0 0120 5.5v8A2.5 2.5 0 0117.5 16H10l-4.5 4v-4h-1A2.5 2.5 0 010 13.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

// هر کارت یه مدال آیکون مخصوص خودش می‌گیره: ورودی=رعد خنثی، محبوب=ستاره‌ی سبز، به‌صرفه‌ترین=الماس کهربایی
function packageAccent(pkg: CreditPackage) {
  if (pkg.isPopular) {
    return {
      Icon: StarIcon,
      iconWrap: "bg-emerald-500/15",
      iconColor: "text-emerald-400",
      card: "border-emerald-500/40 bg-gradient-to-b from-emerald-500/[0.07] to-transparent shadow-[0_0_44px_rgba(16,185,129,0.12)]",
      ribbon: "bg-emerald-500",
      button: "bg-emerald-500 text-white hover:bg-emerald-400",
      divider: "bg-emerald-500/20",
      statChip: "bg-emerald-500/8",
      statText: "text-emerald-100",
      statOr: "text-emerald-300",
    };
  }
  if (pkg.isBestValue) {
    return {
      Icon: DiamondIcon,
      iconWrap: "bg-amber-500/15",
      iconColor: "text-amber-400",
      card: "border-amber-500/35 bg-gradient-to-b from-amber-500/[0.06] to-transparent",
      ribbon: "bg-amber-500",
      button: "border border-slate-600 text-slate-300 hover:border-slate-500",
      divider: "bg-amber-500/20",
      statChip: "bg-amber-500/8",
      statText: "text-amber-100",
      statOr: "text-amber-300",
    };
  }
  return {
    Icon: BoltIcon,
    iconWrap: "bg-slate-400/15",
    iconColor: "text-slate-400",
    card: "border-slate-700/60 bg-slate-800/40 hover:border-slate-600",
    ribbon: null,
    button: "border border-slate-600 text-slate-300 hover:border-slate-500",
    divider: "bg-slate-700/50",
    statChip: "bg-white/[0.03]",
    statText: "text-slate-300",
    statOr: "text-slate-600",
  };
}

function PackageCard({
  pkg,
  loading,
  onBuy,
}: {
  pkg: CreditPackage;
  loading: boolean;
  onBuy: () => void;
}) {
  const hasDiscount = pkg.discountPercent > 0;
  // priceToman از بک‌اند همیشه قیمت نهایی (بعد از تخفیف) است — قیمت اصلی (بدون تخفیف) معکوسِ
  // همون فرمول computePackagePrice بک‌اند است: priceToman / (1 - discountPercent/100)
  const originalPrice = hasDiscount ? Math.round(pkg.priceToman / (1 - pkg.discountPercent / 100)) : null;
  const approxImages = Math.max(1, Math.round(pkg.credits / CREDITS_PER_IMAGE_ESTIMATE));
  const approxMessages = Math.max(1, Math.round(pkg.credits / CREDITS_PER_MESSAGE_ESTIMATE));
  const accent = packageAccent(pkg);
  const ribbonLabel = pkg.isPopular ? fa.credits.popular : pkg.isBestValue ? fa.credits.bestValue : null;

  return (
    <div className={clsx("relative flex flex-col rounded-3xl border p-7 transition-all duration-300", accent.card)}>
      {ribbonLabel && (
        <span className={clsx("absolute -top-3.5 right-1/2 translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-xs font-bold text-white", accent.ribbon)}>
          {ribbonLabel}
        </span>
      )}

      <div className="flex items-center gap-3.5">
        <div className={clsx("flex size-[52px] shrink-0 items-center justify-center rounded-2xl", accent.iconWrap)}>
          <accent.Icon className={accent.iconColor} />
        </div>
        <div className="flex flex-1 items-center justify-between gap-2">
          <h3 className="text-lg font-extrabold text-slate-100">
            {pkg.credits.toLocaleString("fa-IR")} {fa.credits.creditsUnit}
          </h3>
          {hasDiscount && (
            <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-400">
              {pkg.discountPercent}٪ تخفیف
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-baseline gap-x-2">
        <span className="text-[32px] font-extrabold text-slate-100">
          {pkg.priceToman.toLocaleString("fa-IR")}
        </span>
        <span className="text-[13px] text-slate-500">تومان</span>
      </div>
      {originalPrice !== null && (
        <p className="mt-1 text-xs text-slate-600 line-through">
          {originalPrice.toLocaleString("fa-IR")} تومان
        </p>
      )}

      <div className={clsx("my-6 h-px", accent.divider)} />

      <div className="flex items-center gap-2.5">
        <div className={clsx("flex flex-1 items-center gap-2 rounded-2xl px-3 py-2.5", accent.statChip)}>
          <ImageStatIcon className={accent.iconColor} />
          <span className={clsx("text-[13px] font-semibold", accent.statText)}>
            {approxImages.toLocaleString("fa-IR")} عکس
          </span>
        </div>
        <span className={clsx("text-[11px]", accent.statOr)}>یا</span>
        <div className={clsx("flex flex-1 items-center gap-2 rounded-2xl px-3 py-2.5", accent.statChip)}>
          <ChatStatIcon className={accent.iconColor} />
          <span className={clsx("text-[13px] font-semibold", accent.statText)}>
            {approxMessages.toLocaleString("fa-IR")} پیام
          </span>
        </div>
      </div>

      <button
        onClick={onBuy}
        disabled={loading}
        className={clsx("mt-6 rounded-xl py-3 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50", accent.button)}
      >
        {loading ? fa.credits.buying : fa.credits.buyButton}
      </button>
    </div>
  );
}

function CustomAmountCard({
  customPackage,
  customCredits,
  setCustomCredits,
  purchasing,
  onBuy,
}: {
  customPackage: CreditPackage;
  customCredits: string;
  setCustomCredits: (v: string) => void;
  purchasing: boolean;
  onBuy: () => void;
}) {
  const debouncedCredits = useDebouncedValue(customCredits, 400);
  const debouncedValue = Number(debouncedCredits);
  const isValidAmount = Boolean(debouncedCredits) && debouncedValue >= customPackage.credits;
  const { data: quote, isFetching: quoting } = useCreditQuote(debouncedValue, isValidAmount);

  return (
    <div className="mt-8">
      <div className="relative flex flex-col gap-8 rounded-3xl border border-fuchsia-500/40 bg-gradient-to-b from-fuchsia-500/[0.06] to-transparent p-8 md:flex-row md:items-center">
        <span className="absolute -top-3.5 right-6 rounded-full bg-fuchsia-500 px-4 py-1 text-xs font-medium text-white">
          {fa.credits.customAmount}
        </span>
        <div className="flex flex-1 items-center gap-3.5">
          <div className="flex size-[52px] shrink-0 items-center justify-center rounded-2xl bg-fuchsia-500/15">
            <PlusIcon className="text-fuchsia-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-100">{fa.credits.customAmountLabel}</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
              {`حداقل ${customPackage.credits.toLocaleString("fa-IR")} ${fa.credits.creditsUnit} — ${customPackage.discountPercent}٪ تخفیف`}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col justify-center gap-3 md:w-64">
          <input
            type="text"
            inputMode="numeric"
            value={customCredits}
            onChange={(e) => setCustomCredits(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder={`${fa.credits.customAmountPlaceholder} ${customPackage.credits.toLocaleString("fa-IR")}`}
            dir="ltr"
            className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-center text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-fuchsia-500/50"
          />
          {/* قیمت زنده — debounce شده (۴۰۰ms)، از GET /v2/credits/quote تا فرمول واقعی
              (purchaseMarkup و ...) دوباره سمت فرانت نوشته نشود */}
          <div className="h-4 text-center text-xs text-slate-500">
            {isValidAmount && (quoting
              ? "…"
              : quote
                ? `${quote.priceToman.toLocaleString("fa-IR")} تومان`
                : null)}
          </div>
          <button
            onClick={onBuy}
            disabled={purchasing}
            className="rounded-xl bg-fuchsia-500 py-3 text-sm font-semibold text-white transition-all hover:bg-fuchsia-400 active:scale-95 disabled:opacity-50"
          >
            {purchasing ? fa.credits.buying : fa.credits.buyButton}
          </button>
        </div>
      </div>
    </div>
  );
}
