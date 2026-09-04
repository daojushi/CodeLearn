import { getDb } from './connection'
import { deleteImage, saveImage } from '../images'
import type {
  ContentBlock,
  ContentBlockDraft,
  KnowledgePoint,
  MistakePreset,
  Problem,
  ProblemDetail,
  ProblemDraft,
  ProblemListItem,
  ProblemPatch,
  Rank,
  ReviewResult,
  Solution
} from '../../shared/types'

const PROBLEM_COLUMNS = `
  id, title, rank, status, inspiration, note,
  review_stage AS reviewStage,
  last_reviewed_at AS lastReviewedAt,
  next_review_at AS nextReviewAt,
  review_count AS reviewCount,
  created_at AS createdAt,
  updated_at AS updatedAt
`

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

function toProblem(row: Record<string, unknown>): Problem {
  return {
    id: row.id as number,
    title: row.title as string,
    rank: row.rank as Rank,
    status: row.status as Problem['status'],
    inspiration: row.inspiration as string,
    note: row.note as string,
    reviewStage: row.reviewStage as number,
    lastReviewedAt: (row.lastReviewedAt as number | null) ?? null,
    nextReviewAt: (row.nextReviewAt as number | null) ?? null,
    reviewCount: row.reviewCount as number,
    createdAt: row.createdAt as number,
    updatedAt: row.updatedAt as number
  }
}

/** 任一变更后刷新 updated_at */
export function touchProblem(id: number): void {
  getDb()
    .prepare('UPDATE problems SET updated_at = ? WHERE id = ?')
    .run(Date.now(), id)
}

/** 列表行聚合列:知识点名 / 错因名 / 最近一次复习结果(spec §25 行尾提示用) */
const LIST_ITEM_EXTRA = `
  (SELECT json_group_array(k.name)
     FROM problem_knowledge_points pk JOIN knowledge_points k ON k.id = pk.knowledge_point_id
    WHERE pk.problem_id = p.id) AS kpNamesJson,
  (SELECT json_group_array(m.name)
     FROM problem_mistakes pm JOIN mistake_presets m ON m.id = pm.preset_id
    WHERE pm.problem_id = p.id) AS mistakeNamesJson,
  (SELECT result FROM reviews r WHERE r.problem_id = p.id
     ORDER BY r.reviewed_at DESC LIMIT 1) AS lastReviewResult`

function rowsToItems(rows: Record<string, unknown>[]): ProblemListItem[] {
  return rows.map((row) => {
    const parseJson = (raw: unknown): string[] =>
      (JSON.parse((raw as string) ?? '[]') as string[]) ?? []
    return {
      ...toProblem(row),
      kpNames: parseJson(row.kpNamesJson),
      mistakeNames: parseJson(row.mistakeNamesJson),
      lastReviewResult: (row.lastReviewResult as ReviewResult | null) ?? null
    }
  })
}

/** 通用列表查询;whereSql 形如 "WHERE … ORDER BY …"(仅内部拼常量/参数) */
export function queryProblemListItems(
  whereSql: string,
  params: (number | string)[] = []
): ProblemListItem[] {
  const rows = getDb()
    .prepare(`SELECT ${PROBLEM_COLUMNS},\n${LIST_ITEM_EXTRA}\nFROM problems p ${whereSql}`)
    .all(...params) as Record<string, unknown>[]
  return rowsToItems(rows)
}

export function listProblems(): ProblemListItem[] {
  return queryProblemListItems('ORDER BY p.created_at DESC')
}

export function getProblemDetail(id: number): ProblemDetail | null {
  const db = getDb()
  const problemRow = db
    .prepare(`SELECT ${PROBLEM_COLUMNS} FROM problems WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined
  if (!problemRow) return null

  const blocks = db
    .prepare(
      `SELECT id, problem_id AS problemId, position, type, text, image_filename AS imageFilename
         FROM content_blocks WHERE problem_id = ? ORDER BY position`
    )
    .all(id) as unknown as ContentBlock[]

  const knowledgePoints = db
    .prepare(
      `SELECT k.id, k.name, k.description, k.category,
              k.created_at AS createdAt, k.updated_at AS updatedAt
         FROM problem_knowledge_points pk JOIN knowledge_points k ON k.id = pk.knowledge_point_id
        WHERE pk.problem_id = ? ORDER BY k.name`
    )
    .all(id) as unknown as KnowledgePoint[]

  const mistakes = db
    .prepare(
      `SELECT m.id, m.name, m.is_built_in AS isBuiltIn
         FROM problem_mistakes pm JOIN mistake_presets m ON m.id = pm.preset_id
        WHERE pm.problem_id = ? ORDER BY m.id`
    )
    .all(id) as unknown as MistakePreset[]

  const solutions = db
    .prepare(
      `SELECT s.id, s.problem_id AS problemId, s.title, s.description,
              s.language_id AS languageId, l.name AS languageName,
              s.code, s.created_at AS createdAt, s.updated_at AS updatedAt
         FROM solutions s LEFT JOIN language_presets l ON l.id = s.language_id
        WHERE s.problem_id = ? ORDER BY s.created_at`
    )
    .all(id) as unknown as Solution[]

  return { ...toProblem(problemRow), blocks, knowledgePoints, mistakes, solutions }
}

export function createProblem(draft: ProblemDraft): Problem {
  const db = getDb()
  const title = draft.title.trim()
  if (!title) throw new Error('标题不能为空')

  const now = Date.now()
  // 新建后默认次日 00:00 起进入复习队列;已掌握的问题不排期
  const nextReviewAt = draft.status === 'mastered' ? null : dueAtLocalMidnight(now, 1)

  const id = db
    .prepare(
      `INSERT INTO problems (title, rank, status, created_at, updated_at, next_review_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(title, draft.rank, draft.status, now, now, nextReviewAt).lastInsertRowid as number

  let position = 0
  for (const block of draft.blocks) {
    if (block.type === 'image') {
      if (!block.dataUrl) continue
      const imageFilename = saveImage(block.dataUrl)
      db.prepare(
        `INSERT INTO content_blocks (problem_id, position, type, image_filename)
         VALUES (?, ?, 'image', ?)`
      ).run(id, position++, imageFilename)
    } else if (block.text && block.text.trim()) {
      db.prepare(
        `INSERT INTO content_blocks (problem_id, position, type, text)
         VALUES (?, ?, 'text', ?)`
      ).run(id, position++, block.text)
    }
  }

  const linkKp = db.prepare(
    `INSERT OR IGNORE INTO problem_knowledge_points (problem_id, knowledge_point_id) VALUES (?, ?)`
  )
  for (const kpId of draft.knowledgePointIds) linkKp.run(id, kpId)

  const row = db
    .prepare(`SELECT ${PROBLEM_COLUMNS} FROM problems WHERE id = ?`)
    .get(id) as Record<string, unknown>
  return toProblem(row)
}

export function updateProblem(id: number, patch: ProblemPatch): void {
  const sets: string[] = []
  const values: (string | number | null)[] = []
  const now = Date.now()

  if (patch.title !== undefined) {
    sets.push('title = ?')
    values.push(patch.title.trim())
  }
  if (patch.rank !== undefined) {
    sets.push('rank = ?')
    values.push(patch.rank)
  }
  if (patch.inspiration !== undefined) {
    sets.push('inspiration = ?')
    values.push(patch.inspiration)
  }
  if (patch.note !== undefined) {
    sets.push('note = ?')
    values.push(patch.note)
  }
  if (patch.status !== undefined) {
    sets.push('status = ?')
    values.push(patch.status)
    if (patch.status === 'mastered') {
      // 标记已掌握 → 退出复习队列
      sets.push('next_review_at = NULL')
    } else {
      // 从已掌握改回其他状态 → 若尚未排期则重新排次日 00:00
      sets.push('next_review_at = COALESCE(next_review_at, ?)')
      values.push(dueAtLocalMidnight(now, 1))
    }
  }

  if (sets.length === 0) return
  sets.push('updated_at = ?')
  values.push(now)
  getDb()
    .prepare(`UPDATE problems SET ${sets.join(', ')} WHERE id = ?`)
    .run(...values, id)
}

export function removeProblem(id: number): void {
  const db = getDb()
  const blocks = db
    .prepare(`SELECT image_filename AS imageFilename FROM content_blocks
               WHERE problem_id = ? AND type = 'image'`)
    .all(id) as { imageFilename: string }[]
  for (const b of blocks) if (b.imageFilename) deleteImage(b.imageFilename)
  db.prepare('DELETE FROM problems WHERE id = ?').run(id)
}

/* ---------- Content Blocks ---------- */

export function addBlock(problemId: number, draft: ContentBlockDraft): ContentBlock {
  const db = getDb()
  const { max } = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS max FROM content_blocks WHERE problem_id = ?')
    .get(problemId) as { max: number }
  const position = max + 1

  let result: ContentBlock
  const insert = (sql: string, ...params: (string | number | null)[]): ContentBlock => {
    const { lastInsertRowid } = db.prepare(sql).run(...params)
    return {
      id: Number(lastInsertRowid),
      problemId,
      position,
      type: 'text',
      text: null,
      imageFilename: null
    }
  }
  if (draft.type === 'image' && draft.dataUrl) {
    const imageFilename = saveImage(draft.dataUrl)
    result = insert(
      `INSERT INTO content_blocks (problem_id, position, type, image_filename)
       VALUES (?, ?, 'image', ?)`,
      problemId,
      position,
      imageFilename
    )
    result.type = 'image'
    result.imageFilename = imageFilename
  } else if (draft.type === 'text' && draft.text && draft.text.trim()) {
    result = insert(
      `INSERT INTO content_blocks (problem_id, position, type, text) VALUES (?, ?, 'text', ?)`,
      problemId,
      position,
      draft.text
    )
    result.text = draft.text
  } else {
    throw new Error('空的内容块')
  }
  touchProblem(problemId)
  return result
}

export function deleteBlock(blockId: number): void {
  const db = getDb()
  const row = db
    .prepare(`SELECT problem_id AS problemId, image_filename AS imageFilename
                FROM content_blocks WHERE id = ?`)
    .get(blockId) as { problemId: number; imageFilename: string | null } | undefined
  if (!row) return
  if (row.imageFilename) deleteImage(row.imageFilename)
  db.prepare('DELETE FROM content_blocks WHERE id = ?').run(blockId)
  touchProblem(row.problemId)
}

/* ---------- 关联(Knowledge Point / Mistake) ---------- */

export function addProblemKnowledge(problemId: number, kpId: number): void {
  getDb()
    .prepare('INSERT OR IGNORE INTO problem_knowledge_points (problem_id, knowledge_point_id) VALUES (?, ?)')
    .run(problemId, kpId)
  touchProblem(problemId)
}

export function removeProblemKnowledge(problemId: number, kpId: number): void {
  getDb()
    .prepare('DELETE FROM problem_knowledge_points WHERE problem_id = ? AND knowledge_point_id = ?')
    .run(problemId, kpId)
  touchProblem(problemId)
}

export function addProblemMistake(problemId: number, presetId: number): void {
  getDb()
    .prepare('INSERT OR IGNORE INTO problem_mistakes (problem_id, preset_id) VALUES (?, ?)')
    .run(problemId, presetId)
  touchProblem(problemId)
}

export function removeProblemMistake(problemId: number, presetId: number): void {
  getDb()
    .prepare('DELETE FROM problem_mistakes WHERE problem_id = ? AND preset_id = ?')
    .run(problemId, presetId)
  touchProblem(problemId)
}
