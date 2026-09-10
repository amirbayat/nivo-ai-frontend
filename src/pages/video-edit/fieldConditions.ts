import type { FieldCondition, FieldValues, KieField } from '@/types/inputFields'

// پورت دقیق evaluateCondition/isPresent از nivo-ai-backend/generic-payload-builder.ts —
// همون زبان شرط، هم برای نمایش/الزام فیلد سمت فرانت هم برای validation سمت بک‌اند، تا دو
// پیاده‌سازی موازی از یک منطق نداشته باشیم.

export function isPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

export function evaluateCondition(condition: FieldCondition, values: FieldValues): boolean {
  switch (condition.kind) {
    case 'fieldPresent':
      return isPresent(values[condition.fieldKey])
    case 'fieldAbsent':
      return !isPresent(values[condition.fieldKey])
    case 'fieldEquals':
      return values[condition.fieldKey] === condition.value
    case 'and':
      return condition.all.every(c => evaluateCondition(c, values))
    case 'or':
      return condition.any.some(c => evaluateCondition(c, values))
    default:
      return false
  }
}

export function isFieldVisible(field: KieField, values: FieldValues): boolean {
  return !field.visibleWhen || evaluateCondition(field.visibleWhen, values)
}

export function isFieldRequired(field: KieField, values: FieldValues): boolean {
  if (field.required) return true
  return !!field.requiredWhen && evaluateCondition(field.requiredWhen, values)
}
