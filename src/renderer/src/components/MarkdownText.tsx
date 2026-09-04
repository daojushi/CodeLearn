import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'

/**
 * 轻量 Markdown 渲染(备注 / 灵感 / 题解描述 / 知识点描述,spec P1)。
 * - remark-breaks:单个换行也渲染为换行(照顾习惯直接换行的纯文本)
 * - remark-gfm:表格 / 删除线 / 自动链接
 * - 代码围栏用深色块;围栏内 code 细节在 main.css 的 .md-body pre code 里修正
 * 说明:题解代码域仍走 CodeBlock(hljs 高亮),不经过这里。
 */
export default function MarkdownText({
  source,
  className
}: {
  source: string
  className?: string
}): React.JSX.Element {
  const base = className ?? 'text-sm leading-relaxed text-zinc-800'
  return (
    <div className={`md-body ${base}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          h1: (p) => <h1 className="mt-2 mb-1 text-lg font-semibold first:mt-0" {...p} />,
          h2: (p) => <h2 className="mt-2 mb-1 text-base font-semibold first:mt-0" {...p} />,
          h3: (p) => <h3 className="mt-2 mb-1 text-sm font-semibold first:mt-0" {...p} />,
          p: (p) => <p className="my-1 last:mb-0" {...p} />,
          ul: (p) => <ul className="my-1 list-disc pl-5" {...p} />,
          ol: (p) => <ol className="my-1 list-decimal pl-5" {...p} />,
          li: (p) => <li className="my-0.5" {...p} />,
          a: (p) => (
            <a className="text-zinc-700 underline underline-offset-2" {...p} />
          ),
          strong: (p) => <strong className="font-semibold" {...p} />,
          blockquote: (p) => (
            <blockquote className="my-1 border-l-2 border-zinc-200 pl-3 text-zinc-500" {...p} />
          ),
          hr: (p) => <hr className="my-3 border-zinc-200" {...p} />,
          pre: (p) => (
            <pre
              className="my-2 overflow-x-auto rounded-md bg-zinc-900 p-3 text-[12.5px] leading-relaxed text-zinc-100 first:mt-0 last:mb-0"
              {...p}
            />
          ),
          code: (p) => (
            <code
              className="rounded bg-zinc-100 px-1 py-px font-mono text-[0.85em] text-zinc-700"
              {...p}
            />
          ),
          table: (p) => <table className="my-2 w-full border-collapse text-[13px]" {...p} />,
          th: (p) => (
            <th className="border border-zinc-200 bg-zinc-50 px-2 py-1 font-semibold" {...p} />
          ),
          td: (p) => <td className="border border-zinc-200 px-2 py-1" {...p} />
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}
