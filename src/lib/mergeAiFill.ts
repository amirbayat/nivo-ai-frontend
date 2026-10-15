// docs/PRD-seller-panel-simplification.md §4.4 — نتیجه‌ی ai-fill هرگز چیزی را که فروشنده خودش
// نوشته overwrite نمی‌کند؛ اگر مقدار AI فرق دارد، فقط به‌صورت «پیشنهاد AI» (چیپ) برمی‌گردد.
export interface AiFillSuggestion {
  name?: string
  basePrice?: number
  stock?: number
  trackStock?: boolean
  description?: string
}

export interface AiFillFormState {
  name: string
  price: string // رقم‌های خالص (بدون جداکننده)؛ '' = خالی
  stock: string
  alwaysInStock: boolean
  description: string
}

export type AiFillField = 'name' | 'price' | 'stock' | 'description'

export interface AiFillMergeResult {
  next: AiFillFormState
  // فیلدهایی که AI پر کرد (نشان ✨ تا فروشنده ویرایششان کند)
  filled: AiFillField[]
  // فیلدهایی که فروشنده پر کرده بود و AI مقدار متفاوتی داد (چیپ «پیشنهاد AI: …»)
  suggestions: Partial<Record<AiFillField, string>>
}

export function mergeAiFill(current: AiFillFormState, s: AiFillSuggestion): AiFillMergeResult {
  const next = { ...current }
  const filled: AiFillField[] = []
  const suggestions: Partial<Record<AiFillField, string>> = {}

  const apply = (field: AiFillField, value: string | undefined) => {
    if (value === undefined || value === '') return
    const cur = current[field]
    if (cur.trim() === '') {
      next[field] = value
      filled.push(field)
    } else if (cur.trim() !== value.trim()) {
      suggestions[field] = value
    }
  }

  apply('name', s.name)
  apply('price', s.basePrice !== undefined ? String(s.basePrice) : undefined)
  apply('description', s.description)

  if (s.trackStock === false) {
    // «همیشه موجود» فقط وقتی فروشنده موجودی را ننوشته بود
    if (!current.alwaysInStock && current.stock.trim() === '') {
      next.alwaysInStock = true
      filled.push('stock')
    }
  } else {
    apply('stock', s.stock !== undefined ? String(s.stock) : undefined)
  }
  return { next, filled, suggestions }
}
