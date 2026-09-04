import { DatabaseSync } from 'node:sqlite'

let db: DatabaseSync | null = null

/**
 * 打开(必要时创建)本地数据库并做基础初始化。
 * schema_migrations 在此建立;业务迁移由 migrations.ts 执行。
 */
export function initDatabase(filePath: string): void {
  db = new DatabaseSync(filePath)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )
  `)
  const row = db.prepare('SELECT sqlite_version() AS v').get() as { v: string }
  console.log(`[main] db ready: ${filePath} (sqlite ${row.v})`)
}

export function getDb(): DatabaseSync {
  if (!db) throw new Error('[main] database not initialized')
  return db
}

/** 关闭连接并释放句柄(close 时自动做 WAL checkpoint);数据目录迁移前调用 */
export function closeDb(): void {
  db?.close()
  db = null
}
