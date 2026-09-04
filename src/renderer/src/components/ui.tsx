import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { RANK_CLASS, RANK_ORDER, STATUS_LABELS } from '../lib/constants'
import type { ProblemStatus, Rank } from '../../../shared/types'

/** S/A/B/C 徽章(纯展示,如 Knowledge 详情行) */
export function RankBadge({ rank }: { rank: Rank }): React.JSX.Element {
  return (
    <span
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white ${RANK_CLASS[rank]}`}
    >
      {rank}
    </span>
  )
}

/** Rank 直选下拉:点开直接选 S/A/B/C,一步到位(替代逐次循环点击);无 onChange 时退化为静态徽章 */
export function RankSelect({
  rank,
  onChange
}: {
  rank: Rank
  onChange?: (next: Rank) => void
}): React.JSX.Element {
  if (!onChange) return <RankBadge rank={rank} />
  return (
    <span className="relative inline-flex shrink-0">
      <select
        value={rank}
        onChange={(e) => onChange(e.target.value as Rank)}
        title={`评级 ${rank} · 点击可直接选择`}
        className={`h-6 cursor-pointer appearance-none rounded-md border-0 pl-2 pr-4 text-xs font-bold text-white outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-zinc-400 ${RANK_CLASS[rank]}`}
      >
        {RANK_ORDER.map((r) => (
          <option key={r} value={r} style={{ background: '#fff', color: '#18181b' }}>
            {r}
          </option>
        ))}
      </select>
      <ChevronDown
        size={11}
        className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-white/80"
      />
    </span>
  )
}

/** Status 下拉(带中文标签) */
export function StatusSelect({
  status,
  onChange
}: {
  status: ProblemStatus
  onChange?: (next: ProblemStatus) => void
}): React.JSX.Element {
  const select = (
    <select
      className="cursor-pointer rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 outline-none hover:border-zinc-400 focus:border-zinc-500"
      value={status}
      disabled={!onChange}
      onChange={(e) => onChange?.(e.target.value as ProblemStatus)}
    >
      {Object.entries(STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  )
  return select
}

/** 区块标题(详情页小节) */
export function Section({
  title,
  children
}: {
  title: string
  children?: ReactNode
}): React.JSX.Element {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
        {title}
      </h2>
      {children}
    </section>
  )
}

/** 知识点/语言小 chip;onOpen 时名字可点击(跳转详情),onRemove 显示 × */
export function Chip({
  label,
  onOpen,
  onRemove
}: {
  label: string
  onOpen?: () => void
  onRemove?: () => void
}): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="hover:text-zinc-950 hover:underline"
          title="查看知识点详情"
        >
          {label}
        </button>
      ) : (
        label
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-zinc-400 hover:text-red-500"
          title="移除"
        >
          ×
        </button>
      )}
    </span>
  )
}

/** 空态占位 */
export function EmptyHint({
  icon,
  children,
  action
}: {
  icon: ReactNode
  children: ReactNode
  action?: ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-white/60 px-8 py-12 text-center text-sm text-zinc-400">
      <div className="text-zinc-300">{icon}</div>
      <p>{children}</p>
      {action}
    </div>
  )
}

export const inputCls =
  'w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100'
export const btnPrimary =
  'rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40'
export const btnGhost =
  'rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-40'
