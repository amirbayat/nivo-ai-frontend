import { useEffect, useState } from 'react'

function isFormField(el: EventTarget | null): boolean {
  return el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
}

// آیا همین الان یک input/textarea (هرجای صفحه) فوکوس دارد — برای مخفی‌کردن عناصر UI که
// وقتی کیبورد موبایل باز است مزاحم/بی‌مورد می‌شوند (مثل دکمه‌ی نمایش فوتر در AnonChatLayout)
export function useIsInputFocused(): boolean {
  const [focused, setFocused] = useState(() => isFormField(document.activeElement))

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => { if (isFormField(e.target)) setFocused(true) }
    const onFocusOut = (e: FocusEvent) => { if (isFormField(e.target)) setFocused(false) }
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  return focused
}
