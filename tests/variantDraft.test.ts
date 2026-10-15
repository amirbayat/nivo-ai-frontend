import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildVariantsDto, cartesianCombos, comboKey, emptyVariantDraft, reconcileRows, variantDraftFromAi, visibleCombos,
} from '../src/lib/variantDraft.ts'

const draft = () => ({
  options: [{ name: 'سایز', values: ['۳۸', '۴۰'] }, { name: 'رنگ', values: ['مشکی', 'کرم'] }],
  rows: {}, removed: [] as string[],
})

test('cartesian product of two options gives four combos', () => {
  assert.equal(cartesianCombos(draft().options).length, 4)
  assert.deepEqual(cartesianCombos([{ name: 'سایز', values: [] }]), [])
})

test('new combos start with the product main stock (the seller edits only exceptions)', () => {
  const d = reconcileRows(draft(), '5', false)
  assert.equal(Object.keys(d.rows).length, 4)
  assert.ok(Object.values(d.rows).every(r => r.stock === '5'))
})

test('«همیشه موجود» leaves row stock empty and sends no stock', () => {
  const d = reconcileRows(draft(), '5', true)
  assert.ok(Object.values(d.rows).every(r => r.stock === ''))
  const dto = buildVariantsDto(d, {}, true)
  assert.ok(dto.variants.every(v => v.stock === undefined))
})

test('existing rows are kept and removed combos disappear from the dto', () => {
  let d = reconcileRows(draft(), '5', false)
  const key = comboKey({ سایز: '۳۸', رنگ: 'مشکی' })
  d.rows[key] = { ...d.rows[key], stock: '9' }
  d = { ...d, removed: [comboKey({ سایز: '۴۰', رنگ: 'کرم' })] }
  assert.equal(visibleCombos(d).length, 3)
  d = reconcileRows(d, '1', false)
  assert.equal(d.rows[key].stock, '9')
})

test('stock is sent only when it changed vs the loaded value', () => {
  const d = reconcileRows(draft(), '5', false)
  const key = comboKey({ سایز: '۳۸', رنگ: 'مشکی' })
  const dto = buildVariantsDto(d, { [key]: 5 }, false)
  const kept = dto.variants.find(v => comboKey(v.optionValues) === key)!
  assert.equal(kept.stock, undefined)
  assert.equal(dto.variants.filter(v => v.stock === 5).length, 3)
})

test('AI single option maps per-value stock onto combos', () => {
  const d = variantDraftFromAi([{ name: 'سایز', values: [{ value: '۳۸', stock: 2 }, { value: '۴۰' }] }], '7', false)
  assert.equal(d.rows[comboKey({ سایز: '۳۸' })].stock, '2')
  assert.equal(d.rows[comboKey({ سایز: '۴۰' })].stock, '7')
})

test('no options gives an empty dto', () => {
  assert.deepEqual(buildVariantsDto(emptyVariantDraft(), {}, false), { optionTypes: [], variants: [] })
})
