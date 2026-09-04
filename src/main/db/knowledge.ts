import { getDb } from './connection'
import type { KnowledgePatch, KnowledgePoint, KnowledgePointWithCount } from '../../shared/types'

function kpFromRow(row: Record<string, unknown>): KnowledgePoint {
  return {
    id: row.id as number,
    name: row.name as string,
    description: row.description as string,
    category: (row.category as string | null) ?? null,
    createdAt: row.createdAt as number,
    updatedAt: row.updatedAt as number
  }
}

function kpSelect(count: boolean): string {
  return `SELECT k.id, k.name, k.description, k.category,
    k.created_at AS createdAt, k.updated_at AS updatedAt
    ${count ? `, (SELECT COUNT(*) FROM problem_knowledge_points pk
       WHERE pk.knowledge_point_id = k.id) AS problemCount` : ''}
   FROM knowledge_points k`
}

export function listKnowledgePoints(): KnowledgePointWithCount[] {
  const rows = getDb()
    .prepare(`${kpSelect(true)} ORDER BY k.name`)
    .all() as Record<string, unknown>[]
  return rows.map((row) => ({ ...kpFromRow(row), problemCount: row.problemCount as number }))
}

/** 单个知识点(带关联题数);不存在返回 null */
export function getKnowledgePoint(id: number): KnowledgePointWithCount | null {
  const row = getDb()
    .prepare(`${kpSelect(true)} WHERE k.id = ?`)
    .get(id) as Record<string, unknown> | undefined
  if (!row) return null
  return { ...kpFromRow(row), problemCount: row.problemCount as number }
}

/** 更新描述 / 分类(description: 字符串直接替换;category: null 清除、undefined 不动) */
export function updateKnowledgePoint(id: number, patch: KnowledgePatch): void {
  const db = getDb()
  const exists = db.prepare('SELECT id FROM knowledge_points WHERE id = ?').get(id)
  if (!exists) throw new Error('知识点不存在或已删除')

  const sets: string[] = []
  const values: (string | number | null)[] = []
  if (patch.description !== undefined) {
    sets.push('description = ?')
    values.push(patch.description)
  }
  if (patch.category !== undefined) {
    sets.push('category = ?')
    values.push(patch.category === null ? null : patch.category.trim())
  }
  if (sets.length === 0) return
  sets.push('updated_at = ?')
  values.push(Date.now())
  db.prepare(`UPDATE knowledge_points SET ${sets.join(', ')} WHERE id = ?`).run(...values, id)
}

/** 重命名(重名检查,忽略大小写);Problem 关联无需变动(按 id 关联) */
export function renameKnowledgePoint(id: number, name: string): void {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('知识点名称不能为空')
  const dup = getDb()
    .prepare('SELECT id FROM knowledge_points WHERE name = ? COLLATE NOCASE AND id <> ?')
    .get(trimmed, id)
  if (dup) throw new Error(`知识点「${trimmed}」已存在`)
  getDb().prepare('UPDATE knowledge_points SET name = ?, updated_at = ? WHERE id = ?').run(
    trimmed,
    Date.now(),
    id
  )
}

/** 删除知识点:所有 Problem 上的关联(problem_knowledge_points)随之级联清除 */
export function removeKnowledgePoint(id: number): void {
  getDb().prepare('DELETE FROM knowledge_points WHERE id = ?').run(id)
}

/** 按名称查找(忽略大小写) */
export function findKnowledgePoint(name: string): KnowledgePoint | null {
  const row = getDb()
    .prepare(
      `SELECT id, name, description, category,
              created_at AS createdAt, updated_at AS updatedAt
         FROM knowledge_points WHERE name = ? COLLATE NOCASE`
    )
    .get(name) as Record<string, unknown> | undefined
  return row ? kpFromRow(row) : null
}

/** 名称已存在(忽略大小写)则返回现有,否则新建 —— 幂等 */
export function getOrCreateKnowledgePoint(name: string): KnowledgePoint {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('知识点名称不能为空')
  const existing = findKnowledgePoint(trimmed)
  if (existing) return existing

  const db = getDb()
  const now = Date.now()
  db.prepare('INSERT INTO knowledge_points (name, created_at, updated_at) VALUES (?, ?, ?)').run(
    trimmed,
    now,
    now
  )
  const row = db
    .prepare(
      `SELECT id, name, description, category,
              created_at AS createdAt, updated_at AS updatedAt
         FROM knowledge_points WHERE id = last_insert_rowid()`
    )
    .get() as Record<string, unknown>
  return kpFromRow(row)
}
