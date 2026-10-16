import test from 'node:test'
import assert from 'node:assert/strict'
import { applyCartOps, cartCountOf, isCartStale, optimisticTotal, type CartOp } from '../src/lib/optimisticCart.ts'

const base = [{ productId: 'p1', name: 'مانتو', unitPrice: 1000, qty: 2 }]
const add = (productId: string, extra: Partial<CartOp> = {}): CartOp =>
  ({ id: 'o' + productId, kind: 'add', productId, name: 'کیف', unitPrice: 500, startedAt: 0, ...extra }) as CartOp

test('add creates a new line or increments an existing one', () => {
  assert.equal(cartCountOf(applyCartOps(base, [add('p2')])), 3)
  assert.equal(applyCartOps(base, [add('p1')])[0].qty, 3)
})

test('variants are separate lines', () => {
  const out = applyCartOps(base, [add('p1', { variantId: 'v1' } as Partial<CartOp>)])
  assert.equal(out.length, 2)
})

test('qty and remove ops, and a zero quantity drops the line', () => {
  assert.equal(applyCartOps(base, [{ id: 'a', kind: 'qty', productId: 'p1', qty: 5, startedAt: 0 }])[0].qty, 5)
  assert.equal(applyCartOps(base, [{ id: 'a', kind: 'remove', productId: 'p1', startedAt: 0 }]).length, 0)
  assert.equal(applyCartOps(base, [{ id: 'a', kind: 'qty', productId: 'p1', qty: 0, startedAt: 0 }]).length, 0)
})

test('the server list is never mutated and ops apply in order', () => {
  const copy = JSON.stringify(base)
  applyCartOps(base, [add('p2'), { id: 'x', kind: 'remove', productId: 'p2', startedAt: 0 }])
  assert.equal(JSON.stringify(base), copy)
  assert.equal(applyCartOps(base, [add('p2'), { id: 'x', kind: 'remove', productId: 'p2', startedAt: 0 }]).length, 1)
})

test('optimistic total keeps the server discount and adds only the pending delta', () => {
  // server total 1800 = 2000 raw - 200 discount
  assert.equal(optimisticTotal(base, 1800, [add('p2')]), 2300)
  assert.equal(optimisticTotal(base, 1800, []), 1800)
})

test('stale after 5 seconds of a pending op', () => {
  assert.equal(isCartStale([add('p2', { startedAt: 1000 } as Partial<CartOp>)], 5999), false)
  assert.equal(isCartStale([add('p2', { startedAt: 1000 } as Partial<CartOp>)], 6001), true)
  assert.equal(isCartStale([], 99999), false)
})
