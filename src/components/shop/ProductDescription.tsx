import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// توضیحات محصول گاهی markdown است (خروجی AI یا چسباندن فروشنده: **bold**، لیست، جدول سایز).
// متن ساده هم درست نمایش داده می‌شود (خط جدید = شکست خط). HTML خام توسط react-markdown اجرا نمی‌شود.
export function ProductDescription({ text, collapsed }: { text: string; collapsed: boolean }) {
  return (
    <div
      className={`text-[15px] leading-7 text-[var(--shop-text-2)] break-words ${
        collapsed ? 'max-h-[5.25rem] overflow-hidden' : ''
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0 whitespace-pre-line">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-[var(--shop-text-1,inherit)]">{children}</strong>,
          h1: ({ children }) => <h3 className="mt-3 mb-1 text-base font-bold first:mt-0">{children}</h3>,
          h2: ({ children }) => <h3 className="mt-3 mb-1 text-base font-bold first:mt-0">{children}</h3>,
          h3: ({ children }) => <h4 className="mt-3 mb-1 text-[15px] font-bold first:mt-0">{children}</h4>,
          ul: ({ children }) => <ul className="my-2 list-disc ps-5 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal ps-5 space-y-0.5">{children}</ol>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--shop-accent)] underline">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-black/10 px-2 py-1 text-start font-semibold">{children}</th>,
          td: ({ children }) => <td className="border border-black/10 px-2 py-1">{children}</td>,
          hr: () => <hr className="my-3 border-black/10" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
