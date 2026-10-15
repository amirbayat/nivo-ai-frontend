import test from 'node:test'
import assert from 'node:assert/strict'
import { numberToPersianWords as w } from '../src/utils/numberToPersianWords.ts'

test('required PRD cases', () => {
  assert.equal(w(0), 'صفر')
  assert.equal(w(1000), 'هزار')
  assert.equal(w(890000), 'هشتصد و نود هزار')
  assert.equal(w(1250000), 'یک میلیون و دویست و پنجاه هزار')
  assert.equal(w(12400000), 'دوازده میلیون و چهارصد هزار')
  assert.equal(w(1000000000), 'یک میلیارد')
})

test('teens, tens and mixed groups', () => {
  assert.equal(w(15), 'پانزده')
  assert.equal(w(21), 'بیست و یک')
  assert.equal(w(1105), 'هزار و صد و پنج')
  assert.equal(w(2000), 'دو هزار')
  assert.equal(w(319000), 'سیصد و نوزده هزار')
  assert.equal(w(2500000000), 'دو میلیارد و پانصد میلیون')
})

test('invalid input gives empty string', () => {
  assert.equal(w(-5), '')
  assert.equal(w(Number.NaN), '')
})
