import test from 'node:test'
import assert from 'node:assert/strict'
import { splitVariantValues as split } from '../src/lib/splitVariantValues.ts'

test('splits on Persian/English comma, newline and double space', () => {
  assert.deepEqual(split('مشکی،کرم, سفید\nقرمز  آبی'), ['مشکی', 'کرم', 'سفید', 'قرمز', 'آبی'])
})
test('normalises digits to Persian and pasted «۳۸،۴۰،۴۲» makes three chips', () => {
  assert.deepEqual(split('38,۴۰،٤٢'), ['۳۸', '۴۰', '۴۲'])
})
test('dedupes within the input and against existing values', () => {
  assert.deepEqual(split('M, m, L, M', ['L']), ['M'])
  assert.deepEqual(split('۳۸، 38', []), ['۳۸'])
})
test('empty pieces are ignored', () => {
  assert.deepEqual(split(' ،, ,'), [])
})
