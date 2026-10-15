import { useState } from 'react'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { shareOrCopy, productShareUrl } from '@/lib/shareLink'
import { useToastStore } from '@/store/toast.store'
import { useProductTelegramLink } from '@/queries/seller.queries'
import { useLogProductLinkShared } from '@/queries/sellerV2.queries'

const t = fa.seller.v2.product
const toFa = (s: string) => s.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])

interface ShareProps {
  storeId: string
  storeSlug: string
  product: { id: string; name: string; basePrice: number }
}

// «ارسال لینک این محصول» + «لینک تلگرام این محصول» — بعد از انتشار و در منوی لیست
export function ProductShareButtons({ storeId, storeSlug, product }: ShareProps) {
  const addToast = useToastStore(s => s.addToast)
  const log = useLogProductLinkShared(storeId)
  const telegram = useProductTelegramLink(storeId)

  async function shareLink() {
    const url = productShareUrl(storeSlug, product.id)
    const channel = await shareOrCopy({
      url,
      text: t.shareText(product.name, toFa(product.basePrice.toLocaleString('en-US').replace(/,/g, '٬')), url),
    })
    log.mutate({ productId: product.id, channel })
    if (channel === 'copy') addToast(t.linkCopied)
  }

  async function shareTelegram() {
    if (!env.VITE_TELEGRAM_BOT_USERNAME) return
    const { shortCode } = await telegram.mutateAsync(product.id)
    const url = `https://t.me/${env.VITE_TELEGRAM_BOT_USERNAME}?start=p_${shortCode}`
    await navigator.clipboard.writeText(url)
    log.mutate({ productId: product.id, channel: 'telegram' })
    addToast(t.linkCopied)
  }

  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={() => void shareLink()} className="h-11 rounded-xl text-sm font-bold text-emerald-400 light:text-emerald-700">
        {t.shareProductLink}
      </button>
      {env.VITE_TELEGRAM_BOT_USERNAME && (
        <button
          type="button"
          onClick={() => void shareTelegram()}
          disabled={telegram.isPending}
          className="h-10 rounded-xl text-sm text-slate-400 disabled:opacity-40"
        >
          {t.telegramProductLink}
        </button>
      )}
    </div>
  )
}

export function PublishedSheet({
  open,
  onNext,
  onList,
  share,
}: {
  open: boolean
  onNext: () => void
  onList: () => void
  share: ShareProps
}) {
  return (
    <BottomSheet
      open={open}
      onClose={onList}
      title={t.publishedTitle}
      footer={
        <div className="flex flex-col gap-1.5">
          <button type="button" onClick={onNext} className="h-12 w-full rounded-2xl bg-emerald-600 text-[15px] font-bold text-white">
            {t.nextProduct}
          </button>
          <button type="button" onClick={onList} className="h-10 text-sm text-slate-400">
            {t.backToList}
          </button>
        </div>
      }
    >
      <ProductShareButtons {...share} />
    </BottomSheet>
  )
}

// اولین محصول فروشگاه: «ببین بات چطور می‌فروشدش» ← چت تست با پیام اولیه‌ی خودکار
export function FirstProductSheet({
  open,
  onTry,
  onLater,
  share,
}: {
  open: boolean
  onTry: () => void
  onLater: () => void
  share: ShareProps
}) {
  const [shareOpen, setShareOpen] = useState(false)
  return (
    <BottomSheet
      open={open}
      onClose={onLater}
      full
      title={t.firstTitle}
      footer={
        <div className="flex flex-col gap-1.5">
          <button type="button" onClick={onTry} className="h-12 w-full rounded-2xl bg-emerald-600 text-[15px] font-bold text-white">
            {t.tryIt}
          </button>
          <button type="button" onClick={onLater} className="h-10 text-sm text-slate-400">
            {t.later}
          </button>
        </div>
      }
    >
      <p className="text-sm text-slate-300 light:text-slate-600">{t.firstSubtitle}</p>
      <div className="mt-6">
        <button type="button" onClick={() => setShareOpen(v => !v)} className="text-sm text-slate-400 underline">
          {t.shareProductLink}
        </button>
        {shareOpen && <ProductShareButtons {...share} />}
      </div>
    </BottomSheet>
  )
}
