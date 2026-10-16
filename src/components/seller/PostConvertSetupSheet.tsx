import { useEffect, useState } from 'react'
import { fa } from '@/locales/fa'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { DigitsInput } from '@/components/ui/DigitsInput'
import { Input } from '@/components/ui/Input'
import { toEnglishDigits } from '@/lib/digits'
import { extractErrorMessage } from '@/lib/sellerProduct'
import { useAddBankCard, useSlugSuggest, useUpdateStore } from '@/queries/seller.queries'

const t = fa.seller.panel.postConvertSheet
const cleanSlug = (raw: string) => toEnglishDigits(raw).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40)

// DEMO-4 — بعد از «تبدیل به فروشگاه واقعی»: تا نام، لینک و کارت بانکی پر نشود بسته نمی‌شود
// (کارت قالب پاک شده و slug «demo-…» عوض شده؛ بدون این‌ها فروشگاه زنده قابل‌فروش نیست)
export function PostConvertSetupSheet({
  storeId,
  initialName,
  initialSlug,
  onDone,
}: {
  storeId: string
  initialName: string
  initialSlug: string
  onDone: () => void
}) {
  const [name, setName] = useState(initialName)
  const [slug, setSlug] = useState(initialSlug)
  const [slugTouched, setSlugTouched] = useState(false)
  const [card, setCard] = useState('')
  const [owner, setOwner] = useState('')
  const [error, setError] = useState<string | null>(null)
  const suggest = useSlugSuggest(name, slugTouched ? slug : '')
  const update = useUpdateStore(storeId)
  const addCard = useAddBankCard(storeId)

  useEffect(() => {
    if (!slugTouched && suggest.data?.slug) setSlug(suggest.data.slug)
  }, [suggest.data?.slug, slugTouched])

  const cardDigits = toEnglishDigits(card).replace(/\D/g, '')
  const valid = name.trim().length >= 2 && slug.length >= 3 && cardDigits.length === 16 && owner.trim().length >= 2

  async function submit() {
    setError(null)
    try {
      await update.mutateAsync({ name: name.trim(), slug })
      await addCard.mutateAsync({ cardNumber: cardDigits, ownerName: owner.trim() })
      onDone()
    } catch (err) {
      setError(extractErrorMessage(err, t.error))
    }
  }

  return (
    <BottomSheet
      open
      onClose={() => undefined}
      title={t.title}
      footer={
        <Button className="w-full" disabled={!valid} loading={update.isPending || addCard.isPending} onClick={() => void submit()}>
          {t.submit}
        </Button>
      }
    >
      <p className="mb-4 text-sm text-slate-400 light:text-slate-600">{t.hint}</p>
      <div className="flex flex-col gap-3">
        <Input label={t.nameLabel} value={name} onChange={e => setName(e.target.value)} />
        <div>
          <Input
            label={t.slugLabel}
            dir="ltr"
            className="text-left font-mono"
            value={slug}
            onChange={e => {
              setSlugTouched(true)
              setSlug(cleanSlug(e.target.value))
            }}
          />
          <p dir="ltr" className="mt-1 text-left text-xs text-slate-500">nivoai.ir/shop/{slug}</p>
        </div>
        <DigitsInput
          kind="card"
          label={t.cardLabel}
          placeholder="۶۰۳۷ ۰۰۰۰ ۰۰۰۰ ۰۰۰۰"
          value={card}
          onChange={setCard}
          className="text-center tracking-widest"
        />
        <Input label={t.ownerLabel} value={owner} onChange={e => setOwner(e.target.value)} />
        {error && <p className="text-xs text-red-400 light:text-red-600">{error}</p>}
      </div>
    </BottomSheet>
  )
}
