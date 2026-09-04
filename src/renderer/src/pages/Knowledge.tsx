import { useMemo, useState } from 'react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Search } from 'lucide-react'
import type { KnowledgePointWithCount } from '../../../shared/types'
import { EmptyHint } from '../components/ui'

const UNCATEGORIZED = '未分类'

/**
 * Knowledge 列表(spec §24):按分类分组展示,附每题关联数。
 * 点击条目 → 该知识点的详情页。
 */
export default function Knowledge(): React.JSX.Element {
  const [kps, setKps] = useState<KnowledgePointWithCount[]>([])
  const [query, setQuery] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    window.api
      .knowledgeListAll()
      .then((list) => {
        setKps(list)
        setLoaded(true)
      })
      .catch(console.error)
  }, [])

  const q = query.trim().toLowerCase()
  const visible = q ? kps.filter((k) => k.name.toLowerCase().includes(q)) : kps

  // 分组:非空分类按名称排,「未分类」组最后
  const groups = useMemo(() => {
    const map = new Map<string, KnowledgePointWithCount[]>()
    for (const kp of visible) {
      const key = kp.category?.trim() || UNCATEGORIZED
      const list = map.get(key)
      if (list) list.push(kp)
      else map.set(key, [kp])
    }
    return [...map.entries()].sort((a, b) => {
      if (a[0] === UNCATEGORIZED) return 1
      if (b[0] === UNCATEGORIZED) return -1
      return a[0].localeCompare(b[0], 'zh-CN')
    })
  }, [visible])

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="mb-1 text-2xl font-semibold">Knowledge</h1>
      <p className="mb-5 text-sm text-zinc-500">知识点库 · 共 {kps.length} 个</p>

      <div className="relative mb-5">
        <Search
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          value={query}
          placeholder="搜索知识点…"
          className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-8 pr-2 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!loaded ? null : kps.length === 0 ? (
        <EmptyHint icon={<BookOpen size={36} />}>
          还没有知识点。在记录题目时输入「+ 知识点」即可创建。
        </EmptyHint>
      ) : groups.length === 0 ? (
        <EmptyHint icon={<Search size={36} />}>没有名称匹配的知识点。</EmptyHint>
      ) : (
        <div className="space-y-6">
          {groups.map(([category, items]) => (
            <section key={category}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                {category}
              </h2>
              <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
                {items.map((kp) => (
                  <Link
                    key={kp.id}
                    to={`/knowledge/${kp.id}`}
                    className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-zinc-50"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-zinc-800 group-hover:text-zinc-950">
                        {kp.name}
                      </span>
                      {kp.description && (
                        <span className="ml-2 truncate text-xs text-zinc-400">
                          {kp.description}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-zinc-400">{kp.problemCount} 道题</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
