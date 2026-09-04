import { getDb } from './connection'

/** 内置 Mistake Preset(spec §12) */
const BUILTIN_MISTAKES = [
  '没想到正确算法',
  '没识别出题型 / Pattern',
  '思路错误',
  '实现错误',
  '边界条件错误',
  '时间复杂度过高',
  '空间复杂度过高',
  '知识点理解不清',
  '看懂答案但无法独立实现',
  '粗心'
]

/** 内置 Language Preset(spec §16) */
const BUILTIN_LANGUAGES = ['C++', 'Python', 'Java', 'JavaScript', 'Go', 'Rust']

/** 首次启动(对应表为空)时写入内置 Preset */
export function runSeed(): void {
  const db = getDb()
  const now = Date.now()

  const { count: mCount } = db
    .prepare('SELECT COUNT(*) AS count FROM mistake_presets')
    .get() as { count: number }
  if (mCount === 0) {
    const insert = db.prepare(
      'INSERT INTO mistake_presets (name, is_built_in, created_at) VALUES (?, 1, ?)'
    )
    db.exec('BEGIN')
    try {
      for (const name of BUILTIN_MISTAKES) insert.run(name, now)
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
    console.log(`[main] seeded ${BUILTIN_MISTAKES.length} builtin mistake presets`)
  }

  const { count: lCount } = db
    .prepare('SELECT COUNT(*) AS count FROM language_presets')
    .get() as { count: number }
  if (lCount === 0) {
    const insert = db.prepare(
      'INSERT INTO language_presets (name, is_built_in, created_at) VALUES (?, 1, ?)'
    )
    db.exec('BEGIN')
    try {
      for (const name of BUILTIN_LANGUAGES) insert.run(name, now)
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
    console.log(`[main] seeded ${BUILTIN_LANGUAGES.length} builtin language presets`)
  }
}
