import test from 'node:test'
import assert from 'node:assert/strict'
import { computePinnedOrder, orderStepOf } from '../src/lib/orderPinned.ts'
import type { ShopMessage } from '../src/types/api.ts'

const agent = (id: string, text: string, uiBlock?: ShopMessage['uiBlock']): ShopMessage => ({ id, role: 'agent', text, uiBlock })

test('status map: payment pending → registered, receipt → payment, approved, shipped', () => {
  assert.equal(orderStepOf('AWAITING_PAYMENT', null), 0)
  assert.equal(orderStepOf('RECEIPT_SUBMITTED', null), 1)
  assert.equal(orderStepOf('AWAITING_SELLER_APPROVAL', null), 1)
  assert.equal(orderStepOf('COMPLETED', 'APPROVED'), 2)
  assert.equal(orderStepOf('COMPLETED', 'SHIPPED'), 3)
  assert.equal(orderStepOf('COMPLETED', 'DELIVERED'), 3)
})

test('no card without an order or checkout in progress', () => {
  assert.equal(computePinnedOrder([agent('1', 'سلام')], 'BROWSING'), null)
  assert.equal(computePinnedOrder([agent('1', 'سلام')], 'COMPLETED'), null)
})

test('mid-checkout shows the continue card; awaiting payment shows the payment card with the order code', () => {
  assert.equal(computePinnedOrder([], 'ADDRESS_COLLECTION')?.variant, 'continue')
  const pay = computePinnedOrder(
    [agent('1', 'کارت', { type: 'PAYMENT_INSTRUCTIONS', cardNumber: '1', ownerName: 'x', amount: 5, orderCode: 'AB-12' })],
    'AWAITING_PAYMENT',
  )
  assert.equal(pay?.variant, 'payment')
  assert.equal(pay?.orderCode, 'AB-12')
})

test('rejected order keeps the reason and flags an open refund form', () => {
  const card = computePinnedOrder(
    [
      agent('1', 'متاسفانه رسید معتبر نبود'),
      agent('2', '', { type: 'REFUND_DESTINATION_FORM', refundId: 'r', orderId: 'o', amountToman: 10, deadlineHours: 24, status: 'OPEN' }),
    ],
    'REJECTED',
  )
  assert.equal(card?.variant, 'rejected')
  assert.equal(card?.refundOpen, true)
  assert.equal(card?.reason, 'متاسفانه رسید معتبر نبود')
})
