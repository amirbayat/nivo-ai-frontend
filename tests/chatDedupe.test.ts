import test from 'node:test'
import assert from 'node:assert/strict'
import { dedupeProductCards } from '../src/lib/chatDedupe.ts'
import type { ShopMessage } from '../src/types/api.ts'

const prod = (id: string) => ({ id, name: id, basePrice: 1, images: [], hasVariants: false }) as never
const card = (id: string, ids: string[]): ShopMessage => ({
  id,
  role: 'agent',
  text: '',
  uiBlock: { type: 'PRODUCT_CARD', products: ids.map(prod) } as never,
})
const text = (id: string, role: 'agent' | 'customer'): ShopMessage => ({ id, role, text: 'x' })

test('همان محصول در دو جواب پشت‌سرهم بات: بار دوم کارت نمی‌شود', () => {
  const r = dedupeProductCards([card('a', ['p1']), text('c', 'customer'), card('b', ['p1'])])
  assert.equal(r.get('a')!.length, 1)
  assert.equal(r.get('b')!.length, 0)
})

test('فقط محصول تکراری حذف می‌شود', () => {
  const r = dedupeProductCards([card('a', ['p1']), card('b', ['p1', 'p2'])])
  assert.deepEqual(r.get('b')!.map((p) => p.id), ['p2'])
})

test('اگر بین‌شان پیام متنیِ بات باشد دوباره نشان داده می‌شود', () => {
  const r = dedupeProductCards([card('a', ['p1']), text('t', 'agent'), card('b', ['p1'])])
  assert.equal(r.get('b')!.length, 1)
})
