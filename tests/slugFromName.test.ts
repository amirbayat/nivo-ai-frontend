import test from 'node:test'
import assert from 'node:assert/strict'
import { slugFromName } from '../src/lib/slugFromName.ts'

// [QA-13] همین جدول عیناً در nivo-ai-backend/src/common/utils/slug-from-name.spec.ts هم هست.
const TABLE: Array<[string, string]> = [
  ['فروشگاه تست QA نیوو', 'forooshgah-test-qa-nivo'],
  ['فروشگاه مهتاب', 'forooshgah-mahtab'],
  ['لباس بچه', 'lebas-bache'],
  ['گالری طلای سارا', 'gallery-telai-sara'],
  ['کفش و کیف رضایی', 'kafsh-va-kif-rezaii'],
  ['موبایل پارسیان', 'mobile-parsian'],
  ['پوشاک ۲۴ ساعته', 'pooshak-24-saate'],
  ['دیجی کالا', 'diji-kala'],
  ['زیبایی نگین', 'zibaee-negin'],
  ['لوازم آرایشی ژیلا', 'lavazem-arayeshi-zhila'],
  ['نانوایی سنتی', 'nanvaee-sonati'],
  ['استودیو چرم', 'studio-cherm'],
  ['اسباب بازی کودک', 'asbab-bazi-koodak'],
  ['ویترین', 'vitrin'],
  ['هنر دست', 'honar-dest'],
  ['میوه فروشی نوین', 'mive-foroshi-nooin'],
  ['یاس', 'yas'],
  ['Nivo Shop', 'nivo-shop'],
  ['فروشگاه 3 ستاره', 'forooshgah-3-setare'],
]

for (const [name, slug] of TABLE) {
  test(`slugFromName: ${name} -> ${slug}`, () => {
    assert.equal(slugFromName(name), slug)
  })
}
