import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeAiFill, type AiFillFormState } from '../src/lib/mergeAiFill.ts'

const empty: AiFillFormState = { name: '', price: '', stock: '', alwaysInStock: false, description: '' }

test('fills only empty fields and marks them', () => {
  const r = mergeAiFill(empty, { name: 'مانتو', basePrice: 890000, description: 'خوب' })
  assert.deepEqual(r.next, { ...empty, name: 'مانتو', price: '890000', description: 'خوب' })
  assert.deepEqual(r.filled, ['name', 'price', 'description'])
  assert.deepEqual(r.suggestions, {})
})

test('never overwrites what the seller typed; different value becomes a suggestion', () => {
  const r = mergeAiFill({ ...empty, name: 'مانتوی من', price: '500000' }, { name: 'مانتو لینن', basePrice: 890000 })
  assert.equal(r.next.name, 'مانتوی من')
  assert.equal(r.next.price, '500000')
  assert.deepEqual(r.suggestions, { name: 'مانتو لینن', price: '890000' })
  assert.deepEqual(r.filled, [])
})

test('same value as typed gives neither a fill nor a suggestion', () => {
  const r = mergeAiFill({ ...empty, name: 'مانتو' }, { name: 'مانتو' })
  assert.deepEqual(r.suggestions, {})
  assert.deepEqual(r.filled, [])
})

test('«همیشه موجود» is applied only when stock is empty', () => {
  assert.equal(mergeAiFill(empty, { trackStock: false }).next.alwaysInStock, true)
  assert.equal(mergeAiFill({ ...empty, stock: '4' }, { trackStock: false }).next.alwaysInStock, false)
})

test('stock number fills an empty stock field', () => {
  assert.equal(mergeAiFill(empty, { stock: 5 }).next.stock, '5')
})
