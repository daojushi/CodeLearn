import type { ProblemStatus, Rank, ReviewResult } from '../../../shared/types'

/** Status 展示名(spec §8) */
export const STATUS_LABELS: Record<ProblemStatus, string> = {
  not_started: '未开始',
  attempting: '尝试中',
  solved: '已解决',
  need_review: '需复习',
  mastered: '已掌握'
}

/** Rank 徽章配色 */
export const RANK_CLASS: Record<Rank, string> = {
  S: 'bg-rose-500',
  A: 'bg-amber-500',
  B: 'bg-sky-500',
  C: 'bg-zinc-400'
}

export const RANK_ORDER: Rank[] = ['S', 'A', 'B', 'C']

/** Review 结果展示名(spec §18) */
export const REVIEW_LABELS: Record<ReviewResult, string> = {
  forgot: '忘了',
  hard: '有点难',
  solved: '会了',
  easy: '轻松'
}

/** 距今多少天;null = 从未复习 */
export function daysAgoText(ms: number | null): string {
  if (ms === null) return '从未'
  const days = Math.floor((Date.now() - ms) / (24 * 60 * 60 * 1000))
  if (days <= 0) return '今天'
  return `${days} 天前`
}

export function formatDate(ms: number | null): string {
  if (ms === null) return '—'
  const d = new Date(ms)
  const now = new Date()
  const sameYear = d.getFullYear() === now.getFullYear()
  return d.toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' })
  })
}
