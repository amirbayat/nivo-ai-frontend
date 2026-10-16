import test from 'node:test'
import assert from 'node:assert/strict'
import { DEMO_CATEGORY_LABELS } from '../src/lib/demoCategories.ts'
import { DEMO_TOUR_CHIPS, DEMO_TOUR_FALLBACK_CHIPS, demoCategorySlugFromShop, demoTourChips } from '../src/lib/demoTour.ts'

test('slug دسته از slug فروشگاه دمو', () => {
  assert.equal(demoCategorySlugFromShop('demo-clothing-ab12cd34'), 'clothing')
  assert.equal(demoCategorySlugFromShop('demo-bags-shoes-0123abcd'), 'bags-shoes')
  assert.equal(demoCategorySlugFromShop('my-real-shop'), null)
})

test('چیپ‌های هر دسته؛ ناشناخته → چیپ عمومی', () => {
  assert.ok(demoTourChips('demo-clothing-ab12cd34')[0].includes('سایز L'))
  assert.deepEqual(demoTourChips('demo-unknown-ab12cd34'), DEMO_TOUR_FALLBACK_CHIPS)
})

test('هر ۱۶ دسته‌ی دمو چیپ اختصاصی دارد', () => {
  for (const slug of Object.keys(DEMO_CATEGORY_LABELS)) assert.ok(DEMO_TOUR_CHIPS[slug]?.length >= 2, slug)
})
