import { getDb } from './connection'
import { touchProblem } from './problems'
import type { Solution, SolutionDraft } from '../../shared/types'

export function addSolution(problemId: number, draft: SolutionDraft): Solution {
  const db = getDb()
  const now = Date.now()
  db.prepare(
    `INSERT INTO solutions (problem_id, title, description, language_id, code, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(problemId, draft.title.trim(), draft.description, draft.languageId, draft.code, now, now)
  const row = db
    .prepare(
      `SELECT s.id, s.problem_id AS problemId, s.title, s.description,
              s.language_id AS languageId, l.name AS languageName,
              s.code, s.created_at AS createdAt, s.updated_at AS updatedAt
         FROM solutions s LEFT JOIN language_presets l ON l.id = s.language_id
        WHERE s.id = last_insert_rowid()`
    )
    .get() as Record<string, unknown>
  touchProblem(problemId)
  return row as unknown as Solution
}

/** 修改题解(标题/描述/语言/代码);保留创建时间,刷新 updated_at 与所属题目 */
export function updateSolution(solutionId: number, draft: SolutionDraft): void {
  const db = getDb()
  const row = db
    .prepare('SELECT problem_id AS problemId FROM solutions WHERE id = ?')
    .get(solutionId) as { problemId: number } | undefined
  if (!row) throw new Error('题解不存在或已删除')

  db.prepare(
    `UPDATE solutions
        SET title = ?, description = ?, language_id = ?, code = ?, updated_at = ?
      WHERE id = ?`
  ).run(draft.title.trim(), draft.description, draft.languageId, draft.code, Date.now(), solutionId)
  touchProblem(row.problemId)
}

export function removeSolution(solutionId: number): void {
  const row = getDb()
    .prepare('SELECT problem_id AS problemId FROM solutions WHERE id = ?')
    .get(solutionId) as { problemId: number } | undefined
  if (!row) return
  getDb().prepare('DELETE FROM solutions WHERE id = ?').run(solutionId)
  touchProblem(row.problemId)
}
