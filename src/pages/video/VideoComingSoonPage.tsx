import { useNavigate } from 'react-router-dom'

// docs/EXECUTION-PLAN.md — طبق تصمیم صریح کاربر، فلوی تولید ویدیو فعلاً خارج از scope است و
// باید جدا و با وفاداری بیشتر به Google Flow دوباره طراحی شود. کارت ویدیو در هاب طبق آخرین
// دیزاین‌کنوس فعال/کلیک‌پذیر است، پس به‌جای نبود مقصد، این صفحه‌ی موقت را نشان می‌دهد.
export function VideoComingSoonPage() {
  const navigate = useNavigate()
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center"
      style={{ background: '#020C18', color: '#e2e8f0' }}
      dir="rtl"
    >
      <div
        className="flex items-center justify-center"
        style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(14,165,233,0.14)', color: '#38bdf8' }}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1.5" y="5.5" width="15" height="13" rx="2.5" /><polygon points="22.5 7.5 16.5 12 22.5 16.5 22.5 7.5" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-white">تولید ویدیو به‌زودی</h1>
      <p className="max-w-sm text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
        داریم روی این بخش کار می‌کنیم — داستان بگو، کاراکتر بساز، استوری‌برد بچین و ویدیوی هر صحنه رو بگیر.
      </p>
      <button
        onClick={() => navigate('/')}
        className="rounded-full px-5 py-2.5 text-sm font-semibold"
        style={{ background: 'rgba(148,163,184,0.10)', border: '1px solid rgba(148,163,184,0.22)', color: '#e2e8f0' }}
      >
        بازگشت به خانه
      </button>
    </div>
  )
}
