/**
 * 复习排期的基准计算。
 * 刻意独立成零依赖的叶子模块:problems / reviews / curve 都要用它,
 * 挂在 problems.ts 下会让「problems 用 curve、curve 用 problems」成环。
 */

/**
 * 到期时刻按自然日对齐:基准日期 + days 天的当天 00:00(本地时区)。
 * 例:昨晚 20:24 新建、间隔 1 天 → 次日 00:00 起即可复习,而不是精确 24 小时后的今晚 20:24。
 * 让「昨天录的题,今天一早打开就该在 Today 里」符合直觉。
 */
export function dueAtLocalMidnight(baseMs: number, days: number): number {
  const d = new Date(baseMs)
  d.setDate(d.getDate() + days)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
