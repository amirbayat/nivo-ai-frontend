import test from 'node:test'
import assert from 'node:assert/strict'
import { isStockMissing, canSendTrackStock } from '../src/lib/productStock.ts'

test('موجودی‌دار بدون عدد ناقص است', () => {
  assert.equal(isStockMissing({ always: false, hasVariants: false, stock: '' }), true)
  assert.equal(isStockMissing({ always: false, hasVariants: false, stock: 'abc' }), true)
})
test('عدد فارسی یا انگلیسی، همیشه موجود، یا مدل‌دار کامل است', () => {
  assert.equal(isStockMissing({ always: false, hasVariants: false, stock: '۵' }), false)
  assert.equal(isStockMissing({ always: false, hasVariants: false, stock: '0' }), false)
  assert.equal(isStockMissing({ always: true, hasVariants: false, stock: '' }), false)
  assert.equal(isStockMissing({ always: false, hasVariants: true, stock: '' }), false)
})
test('trackStock بدون عدد از false به true نمی‌رود', () => {
  assert.equal(canSendTrackStock({ always: false, hasVariants: false, stock: '', wasTracked: false }), false)
  assert.equal(canSendTrackStock({ always: false, hasVariants: false, stock: '3', wasTracked: false }), true)
  assert.equal(canSendTrackStock({ always: false, hasVariants: false, stock: '', wasTracked: true }), true)
  assert.equal(canSendTrackStock({ always: true, hasVariants: false, stock: '', wasTracked: false }), true)
})
