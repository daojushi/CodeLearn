import { REVIEW_RESULTS, type ProblemListItem, type Review, type ReviewResult } from '../../shared/types'
import { nextStageFor } from '../../shared/review'
import { getDb } from './connection'
import { getReviewCurve } from './curve'
import { dueAtLocalMidnight } from './schedule'
import { queryProblemListItems } from './problems'

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
 * 调度规则见 nextStageFor:忘了 → 退回第 1 档;有点难 → 原地重复;会了 → 进一档;轻松 → 跳两档。
 * 档数由用户的复习曲线决定。
 */
export function submitReview(problemId: number, result: ReviewResult): Review {
  if (!REVIEW_RESULTS.includes(result)) throw new Error('无效的复习结果')
  const db = getDb()
  const p = db
    .prepare('SELECT review_stage AS stage FROM problems WHERE id = ?')
    .get(problemId) as { stage: number } | undefined
  if (!p) throw new Error('题目不存在或已删除')

  const curve = getReviewCurve()
  // 档位可能因曲线被改短而越界:clamp 后连同下一档一起写回,自愈该行
  const stage = nextStageFor(result, p.stage, curve.length)

  const now = Date.now()
  // 按自然日对齐:今天复习 + N 天 → 第 N 天当天 00:00 起可再复习
  const nextReviewAt = dueAtLocalMidnight(now, curve[stage])

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
