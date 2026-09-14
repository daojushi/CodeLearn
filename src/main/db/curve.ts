import { DEFAULT_REVIEW_CURVE, clampReviewStage, validateReviewCurve } from '../../shared/review'
import { getDb } from './connection'
import { dueAtLocalMidnight } from './schedule'

/**
 * 复习曲线(全局一条,spec §18):review_curve_stages 逐档存一行。
 *
 * 空表 = 使用默认曲线,于是「重置为默认」就是清空表,不需要哨兵值,
 * 读路径也不需要解析配置字符串 —— getReviewCurve() 恒返回非空数组
 * (空数组会让 curve[stage] 取到 undefined,算出 NaN 被静默写成 NULL)。
 *
 * 改曲线必须与存量重排一起发生,所以这里不提供「只存不重排」的接口。
 */

/** 当前曲线;用户没自定义过时返回默认曲线(恒非空) */
export function getReviewCurve(): number[] {
  const rows = getDb()
    .prepare('SELECT days FROM review_curve_stages ORDER BY stage')
    .all() as { days: number }[]
  if (rows.length === 0) return [...DEFAULT_REVIEW_CURVE]
  return rows.map((r) => r.days)
}

/**
 * 保存新曲线并立即重排存量(单个事务):
 * 各题档位不变,按新曲线对应天数从基准日(没复习过 = 创建日,否则 = 上次复习日)
 * 重算 next_review_at。
 *
 * 档位超出新曲线长度的会被收进最后一档并写回:否则下次复习时 curve[stage]
 * 取到 undefined → NaN → 被静默写成 NULL,题目会从 Today 里消失且不报错。
 *
 * 刻意不动 updated_at —— 它在列表页当日期列展示、在知识点详情当排序键。
 * 排期条件与 v2 迁移保持一致,避免把历史上被取消排期的行「复活」进 Today。
 */
export function applyReviewCurve(days: number[]): { rescheduled: number } {
  // IPC 层已校验过;这里是纵深防御,也保证本函数能被安全地直接调用
  const { curve, error } = validateReviewCurve(days)
  if (!curve) throw new Error(error ?? '复习曲线不合法')

  const db = getDb()
  db.exec('BEGIN')
  try {
    db.prepare('DELETE FROM review_curve_stages').run()
    const insert = db.prepare('INSERT INTO review_curve_stages (stage, days) VALUES (?, ?)')
    curve.forEach((d, i) => insert.run(i, d))

    // 先物化待重排的行:循环里会改 problems,不能边查边改
    const rows = db
      .prepare(
        `SELECT id, review_stage AS stage,
                COALESCE(last_reviewed_at, created_at) AS baseAt
           FROM problems
          WHERE status != 'mastered' AND next_review_at IS NOT NULL`
      )
      .all() as { id: number; stage: number; baseAt: number }[]

    const update = db.prepare(
      'UPDATE problems SET review_stage = ?, next_review_at = ? WHERE id = ?'
    )
    let rescheduled = 0
    for (const row of rows) {
      const stage = clampReviewStage(row.stage, curve.length)
      const { changes } = update.run(stage, dueAtLocalMidnight(row.baseAt, curve[stage]), row.id)
      rescheduled += Number(changes)
    }

    db.exec('COMMIT')
    return { rescheduled }
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}
