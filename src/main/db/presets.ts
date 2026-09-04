import { getDb } from './connection'
import type { LanguagePreset, MistakePreset } from '../../shared/types'

function rowToMistake(row: Record<string, unknown>): MistakePreset {
  return { id: row.id as number, name: row.name as string, isBuiltIn: row.isBuiltIn === 1 }
}

function rowToLanguage(row: Record<string, unknown>): LanguagePreset {
  return { id: row.id as number, name: row.name as string, isBuiltIn: row.isBuiltIn === 1 }
}

export function listMistakePresets(): MistakePreset[] {
  const rows = getDb()
    .prepare('SELECT id, name, is_built_in AS isBuiltIn FROM mistake_presets ORDER BY is_built_in DESC, id')
    .all() as Record<string, unknown>[]
  return rows.map(rowToMistake)
}

/** 重命名通用逻辑:按表/标签做重名检查后改名(内置项同样可改) */
function renamePreset(
  table: 'mistake_presets' | 'language_presets',
  id: number,
  name: string
): void {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('名称不能为空')
  const dup = getDb()
    .prepare(`SELECT id FROM ${table} WHERE name = ? COLLATE NOCASE AND id <> ?`)
    .get(trimmed, id)
  if (dup) throw new Error(`「${trimmed}」已存在`)
  getDb().prepare(`UPDATE ${table} SET name = ? WHERE id = ?`).run(trimmed, id)
}

export function renameMistakePreset(id: number, name: string): void {
  renamePreset('mistake_presets', id, name)
}

/** 删除 Preset;内置项允许删除。题目上的引用随之级联清除 */
export function removeMistakePreset(id: number): void {
  getDb().prepare('DELETE FROM mistake_presets WHERE id = ?').run(id)
}

export function addMistakePreset(name: string): MistakePreset {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('错误原因名称不能为空')
  const db = getDb()
  db.prepare('INSERT OR IGNORE INTO mistake_presets (name, is_built_in, created_at) VALUES (?, 0, ?)').run(
    trimmed,
    Date.now()
  )
  const row = db
    .prepare('SELECT id, name, is_built_in AS isBuiltIn FROM mistake_presets WHERE name = ? COLLATE NOCASE')
    .get(trimmed) as Record<string, unknown>
  return rowToMistake(row)
}

export function listLanguagePresets(): LanguagePreset[] {
  const rows = getDb()
    .prepare('SELECT id, name, is_built_in AS isBuiltIn FROM language_presets ORDER BY is_built_in DESC, id')
    .all() as Record<string, unknown>[]
  return rows.map(rowToLanguage)
}

export function renameLanguagePreset(id: number, name: string): void {
  renamePreset('language_presets', id, name)
}

/** 删除语言 Preset:被删除语言在既有题解上回退为「无语言」(ON DELETE SET NULL) */
export function removeLanguagePreset(id: number): void {
  getDb().prepare('DELETE FROM language_presets WHERE id = ?').run(id)
}

export function addLanguagePreset(name: string): LanguagePreset {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('语言名称不能为空')
  const db = getDb()
  db.prepare('INSERT OR IGNORE INTO language_presets (name, is_built_in, created_at) VALUES (?, 0, ?)').run(
    trimmed,
    Date.now()
  )
  const row = db
    .prepare('SELECT id, name, is_built_in AS isBuiltIn FROM language_presets WHERE name = ? COLLATE NOCASE')
    .get(trimmed) as Record<string, unknown>
  return rowToLanguage(row)
}
