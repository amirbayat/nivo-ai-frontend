import { Link } from 'react-router-dom'
import { fa } from '@/locales/fa'
import { toEnglishDigits } from '@/lib/digits'
import { DigitsInput } from '@/components/ui/DigitsInput'
import { useGoldPricePreview } from '@/queries/seller.queries'

const PURITY_KARAT_OPTIONS = [18, 21, 22, 24]

// docs/PRD-category-specific-product-pricing-and-attributes.md بخش ۳.۲ — فیلدهای وزن/عیار +
// پیش‌نمایش زنده به‌جای فیلد «قیمت» وقتی pricingModel=WEIGHT_BASED_FORMULA است
export function GoldPricingFields({
  storeId,
  weightGrams,
  setWeightGrams,
  purityKarat,
  setPurityKarat,
  goldPricingConfigured,
  productGoldWageType,
  setProductGoldWageType,
  productGoldWageValue,
  setProductGoldWageValue,
  productGoldProfitPercent,
  setProductGoldProfitPercent,
}: {
  storeId: string
  weightGrams: string
  setWeightGrams: (v: string) => void
  purityKarat: string
  setPurityKarat: (v: string) => void
  goldPricingConfigured: boolean
  productGoldWageType: 'PERCENT' | 'FIXED_PER_GRAM'
  setProductGoldWageType: (v: 'PERCENT' | 'FIXED_PER_GRAM') => void
  productGoldWageValue: string
  setProductGoldWageValue: (v: string) => void
  productGoldProfitPercent: string
  setProductGoldProfitPercent: (v: string) => void
}) {
  const preview = useGoldPricePreview(
    storeId,
    weightGrams ? Number(toEnglishDigits(weightGrams)) : null,
    purityKarat ? Number(purityKarat) : null,
    {
      goldWageType: productGoldWageType,
      goldWageValue: productGoldWageValue ? Number(toEnglishDigits(productGoldWageValue)) : undefined,
      goldProfitPercent: productGoldProfitPercent ? Number(toEnglishDigits(productGoldProfitPercent)) : undefined,
    },
  )

  return (
    <div className="mb-6">
      <div className="mb-3">
        <DigitsInput kind="decimal"
          label={fa.seller.panel.products.weightGramsLabel}
          value={weightGrams}
          onChange={setWeightGrams}
          className="text-center"
        />
      </div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-300 light:text-slate-700">
        {fa.seller.panel.products.purityKaratLabel}
      </label>
      <div className="mb-3 flex gap-2">
        {PURITY_KARAT_OPTIONS.map(k => (
          <button
            key={k}
            type="button"
            onClick={() => setPurityKarat(String(k))}
            className={`flex-1 rounded-lg border py-2 text-sm font-semibold ${
              Number(purityKarat) === k
                ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                : 'border-slate-700 light:border-slate-300 text-slate-400 light:text-slate-600'
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      {(
        <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => setProductGoldWageType('PERCENT')}
              className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${productGoldWageType === 'PERCENT' ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-slate-700 light:border-slate-300 text-slate-400'}`}
            >
              {fa.seller.panel.storeSettings.goldWageTypePercent}
            </button>
            <button
              type="button"
              onClick={() => setProductGoldWageType('FIXED_PER_GRAM')}
              className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${productGoldWageType === 'FIXED_PER_GRAM' ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-slate-700 light:border-slate-300 text-slate-400'}`}
            >
              {fa.seller.panel.storeSettings.goldWageTypeFixedPerGram}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DigitsInput kind="decimal"
              label={
                productGoldWageType === 'PERCENT'
                  ? fa.seller.panel.storeSettings.goldWageValuePercentLabel
                  : fa.seller.panel.storeSettings.goldWageValueFixedLabel
              }
              value={productGoldWageValue}
              onChange={setProductGoldWageValue}
              className="text-center"
            />
            <DigitsInput kind="decimal"
              label={fa.seller.panel.storeSettings.goldProfitPercentLabel}
              value={productGoldProfitPercent}
              onChange={setProductGoldProfitPercent}
              className="text-center"
            />
          </div>
        </div>
      )}

      {!productGoldWageValue && !productGoldProfitPercent && !goldPricingConfigured ? (
        <p className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-300">
          {fa.seller.panel.products.goldSettingsMissing}{' '}
          <Link to="/seller/panel/store/advanced" className="font-semibold underline">
            {fa.seller.panel.products.goldSettingsMissingLink}
          </Link>
        </p>
      ) : preview.data?.error ? (
        <p className="rounded-xl bg-slate-800/40 light:bg-slate-50 p-3 text-xs text-slate-500">{preview.data.error}</p>
      ) : preview.data?.price != null ? (
        <p className="rounded-xl bg-emerald-500/10 p-3 text-sm font-bold text-emerald-300">
          {fa.seller.panel.products.goldPricePreviewLabel} {preview.data.price.toLocaleString('fa-IR')} {fa.common.toman}
        </p>
      ) : null}
    </div>
  )
}
