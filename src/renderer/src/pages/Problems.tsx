import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FilterX, List, Plus, Search } from 'lucide-react'
import { RANKS, STATUSES, type ProblemListItem, type ProblemStatus, type Rank } from '../../../shared/types'
import { btnPrimary, EmptyHint, RankSelect, StatusSelect } from '../components/ui'
import { formatDate, STATUS_LABELS } from '../lib/constants'

/** 筛选条里的小下拉(spec §23 [Rank▼][Status▼][Knowledge▼][Mistake▼]) */
const selectCls =
  'max-w-44 cursor-pointer rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-600 outline-none hover:border-zinc-400 focus:border-zinc-500'

export default function Problems(): React.JSX.Element {
  const [problems, setProblems] = useState<ProblemListItem[]>([])
  const [loaded, setLoaded] = useState(false)

  // 筛选状态:'' = 全部
  const [search, setSearch] = useState('')
  const [rankF, setRankF] = useState<'' | Rank>('')
  const [statusF, setStatusF] = useState<'' | ProblemStatus>('')
  const [kpF, setKpF] = useState('')
  const [mistakeF, setMistakeF] = useState('')
  const [kpOptions, setKpOptions] = useState<{ id: number; name: string }[]>([])
  const [mistakeOptions, setMistakeOptions] = useState<{ id: number; name: string }[]>([])

  async function reload(): Promise<void> {
    setProblems(await window.api.problemsList())
    setLoaded(true)
  }

  useEffect(() => {
    void reload().catch(console.error)
  }, [])

  // 筛选下拉的数据源(名称在列表里按字符串匹配,名称全局唯一)
  useEffect(() => {
    window.api.knowledgeListAll().then(setKpOptions).catch(console.error)
    window.api.mistakePresetsList().then(setMistakeOptions).catch(console.error)
  }, [])

  const filtered = problems.filter((p) => {
    const q = search.trim().toLowerCase()
    if (q && !p.title.toLowerCase().includes(q)) return false
    if (rankF && p.rank !== rankF) return false
    if (statusF && p.status !== statusF) return false
    if (kpF && !p.kpNames.includes(kpF)) return false
    if (mistakeF && !p.mistakeNames.includes(mistakeF)) return false
    return true
  })

  const hasFilter = !!(search.trim() || rankF || statusF || kpF || mistakeF)
  const reset = (): void => {
    setSearch('')
    setRankF('')
    setStatusF('')
    setKpF('')
    setMistakeF('')
  }

  const rows = filtered.map((p) => (
    <div
      key={p.id}
      className="group flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-zinc-300"
    >
      {/* Rank 下拉,点开直接选(spec §8 低摩擦;随时可改,不必进详情) */}
      <RankSelect
        rank={p.rank}
        onChange={(next) => {
          void window.api
            .problemUpdate(p.id, { rank: next })
            .then(reload)
            .catch(console.error)
        }}
      />
      <div className="min-w-0 flex-1">
        <Link
          to={`/problems/${p.id}`}
          className="block truncate font-medium text-zinc-800 hover:text-zinc-950 hover:underline"
          title={p.title}
        >
          {p.title}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {p.kpNames.map((name) => (
            <span
              key={name}
              className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-500"
            >
              {name}
            </span>
          ))}
          {p.mistakeNames.length > 0 && (
            <span className="text-[11px] text-zinc-400">
              错因:{p.mistakeNames.slice(0, 3).join(' / ')}
              {p.mistakeNames.length > 3 ? '…' : ''}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right text-[11px] text-zinc-400">{formatDate(p.updatedAt)}</div>
      <StatusSelect
        status={p.status}
        onChange={(next) => {
          void window.api
            .problemUpdate(p.id, { status: next })
            .then(reload)
            .catch(console.error)
        }}
      />
    </div>
  ))

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Problems</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {hasFilter ? `共 ${problems.length} 道 · 筛出 ${filtered.length} 道` : `共 ${problems.length} 道`}
          </p>
        </div>
        <Link to="/problems/new" className={btnPrimary}>
          <span className="flex items-center gap-1.5">
            <Plus size={15} /> New
          </span>
        </Link>
      </div>

      {/* 搜索 + 四筛选 */}
      <div className="mb-4 rounded-lg border border-zinc-200 bg-white p-3">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={search}
            placeholder="搜索标题…"
            className="w-full rounded-md border border-zinc-200 py-1.5 pl-8 pr-2 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            className={selectCls}
            value={rankF}
            title="按 Rank 筛选"
            onChange={(e) => setRankF(e.target.value as '' | Rank)}
          >
            <option value="">Rank · 全部</option>
            {RANKS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            className={selectCls}
            value={statusF}
            title="按 Status 筛选"
            onChange={(e) => setStatusF(e.target.value as '' | ProblemStatus)}
          >
            <option value="">Status · 全部</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            className={selectCls}
            value={kpF}
            title="按知识点筛选"
            onChange={(e) => setKpF(e.target.value)}
          >
            <option value="">Knowledge · 全部</option>
            {kpOptions.map((k) => (
              <option key={k.id} value={k.name}>
                {k.name}
              </option>
            ))}
          </select>
          <select
            className={selectCls}
            value={mistakeF}
            title="按错误原因筛选"
            onChange={(e) => setMistakeF(e.target.value)}
          >
            <option value="">Mistake · 全部</option>
            {mistakeOptions.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
          {hasFilter && (
            <button
              type="button"
              className="ml-auto flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700"
              onClick={reset}
            >
              <FilterX size={13} /> 重置筛选
            </button>
          )}
        </div>
      </div>

      {!loaded ? null : problems.length === 0 ? (
        <EmptyHint
          icon={<List size={36} />}
          action={
            <Link to="/problems/new" className="text-sm text-zinc-700 underline">
              记录第一道题 →
            </Link>
          }
        >
          还没有题目。做了一道值得回味的题?记下来。
        </EmptyHint>
      ) : filtered.length === 0 ? (
        <EmptyHint
          icon={<FilterX size={36} />}
          action={
            <button type="button" className="text-sm text-zinc-700 underline" onClick={reset}>
              清除筛选条件
            </button>
          }
        >
          没有符合当前条件的题目。
        </EmptyHint>
      ) : (
        <div className="space-y-2">{rows}</div>
      )}
    </div>
  )
}
