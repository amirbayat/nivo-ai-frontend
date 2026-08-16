// از سافاری iOS نسخه ۱۰ به بعد، اپل عمداً user-scalable=no/maximum-scale متای ویوپورت
// (index.html) را نادیده می‌گیرد (تصمیم دسترس‌پذیری) — یعنی آن تنها برای اندروید کروم/دسکتاپ
// واقعاً پینچ‌زوم را می‌بندد. تنها راه واقعی غیرفعال‌کردن پینچ‌زوم روی سافاری، جلوگیری از
// رویدادهای gesture (خاص وبکیت، فقط سافاری می‌فرستد) + touchmove چندانگشتی است.
// زوم با کیبورد دسکتاپ (Ctrl/Cmd +/-) از این طریق قابل مسدودکردن نیست — تصمیم مرورگر/کاربر است.
export function disableZoom() {
  document.addEventListener('gesturestart', e => e.preventDefault())
  document.addEventListener('gesturechange', e => e.preventDefault())

  document.addEventListener(
    'touchmove',
    e => {
      if (e.touches.length > 1) e.preventDefault()
    },
    { passive: false },
  )

  // دابل‌تپ برای زوم — touch-action: manipulation (index.css) اکثر مرورگرها را می‌گیرد،
  // این فقط یک لایه‌ی اطمینان اضافه‌ی مستقل از CSS است
  let lastTouchEnd = 0
  document.addEventListener(
    'touchend',
    e => {
      const now = Date.now()
      if (now - lastTouchEnd <= 300) e.preventDefault()
      lastTouchEnd = now
    },
    { passive: false },
  )
}
