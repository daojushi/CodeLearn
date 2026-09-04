import { REVIEW_RESULTS, type ProblemListItem, type Review, type ReviewResult } from '../../shared/types'
import { getDb } from './connection'
import { dueAtLocalMidnight, queryProblemListItems } from './problems'

/** 复习间隔阶梯(spec §18):1 → 3 → 7 → 14 → 30 天,由 review_stage 索引 */
export const STAGE_DAYS = [1, 3, 7, 14, 30]

/** Today 到期队列:已排期、已到期、且状态不是「已掌握」(已掌握的不进队列) */
export function listDueProblems(): ProblemListItem[] {
  return queryProblemListItems(
    `WHERE p.status != 'mastered' AND p.next_review_at IS NOT NULL AND p.next_review_at <= ?
     ORDER BY p.next_review_at ASC, p.created_at ASC`,
    [Date.now()]
  )
}

/**
 * 提交一次复习(事务):
 *  插 reviews 行 + 更新 review_stage / last_reviewed_at / next_review_at / review_count。
 * 调度规则:Forgot → 退回第 1 天;Hard → 原地重复当前间隔;Solved → 下一档;Easy → 跳两档。
 */
export function submitReview(problemId: number, result: ReviewResult): Review {
  if (!REVIEW_RESULTS.includes(result)) throw new Error('无效的复习结果')
  const db = getDb()
  const p = db
    .prepare('SELECT review_stage AS stage FROM problems WHERE id = ?')
    .get(problemId) as { stage: number } | undefined
  if (!p) throw new Error('题目不存在或已删除')

  let stage = p.stage
  if (result === 'forgot') stage = 0
  else if (result === 'solved') stage = Math.min(stage + 1, STAGE_DAYS.length - 1)
  else if (result === 'easy') stage = Math.min(stage + 2, STAGE_DAYS.length - 1)
  // hard:stage 不变,同一间隔再来一次

  const now = Date.now()
  // 按自然日对齐:今天复习 + N 天 → 第 N 天当天 00:00 起可再复习
  const nextReviewAt = dueAtLocalMidnight(now, STAGE_DAYS[stage])

  db.exec('BEGIN')
  try {
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO reviews (problem_id, result, reviewed_at, next_review_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(problemId, result, now, nextReviewAt)
    db.prepare(
      `UPDATE problems
          SET review_stage = ?, last_reviewed_at = ?, next_review_at = ?,
              review_count = review_count + 1
        WHERE id = ?`
    ).run(stage, now, nextReviewAt, problemId)
    db.exec('COMMIT')
    return { id: Number(lastInsertRowid), problemId, result, reviewedAt: now, nextReviewAt }
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

/** 某题的复习历史(新 → 旧) */
export function listReviews(problemId: number): Review[] {
  const rows = getDb()
    .prepare(
      `SELECT id, problem_id AS problemId, result,
              reviewed_at AS reviewedAt, next_review_at AS nextReviewAt
         FROM reviews WHERE problem_id = ?
        ORDER BY reviewed_at DESC LIMIT 100`
    )
    .all(problemId) as unknown as Review[]
  return rows
}
