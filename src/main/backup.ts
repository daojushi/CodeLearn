import { randomUUID } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { app, dialog, type BrowserWindow } from 'electron'
import { closeDb, getDb, initDatabase } from './db/connection'
import { runMigrations } from './db/migrations'
import { initImagesDir, listImageFiles } from './images'
import { getDataDir } from './storage'

const DB_FILE = 'codelearn.db'
const IMAGES_DIR = 'images'

/** 图片文件名白名单(uuid.ext),导入时防止路径穿越 */
const SAFE_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:png|jpg|jpeg|webp|gif)$/i

function reopen(): void {
  const dir = getDataDir()
  initDatabase(join(dir, DB_FILE))
  // 备份里的库可能是旧版本(例如导入改动前导出的备份),补跑迁移后再交给业务层,
  // 否则整场会话都缺新表,要重启才能恢复
  runMigrations()
  initImagesDir(join(dir, IMAGES_DIR))
}

/** 导出全量备份:DB 一致性快照(VACUUM INTO)+ 全部图片 → 单个 JSON。取消返回 null */
export async function exportBackup(win: BrowserWindow | null): Promise<string | null> {
  const opts: Electron.SaveDialogOptions = {
    title: '导出 CodeLearn 备份',
    defaultPath: join(app.getPath('documents'), `codelearn-backup-${new Date().toISOString().slice(0, 10)}.json`),
    filters: [{ name: 'CodeLearn 备份', extensions: ['json'] }]
  }
  const res = win ? await dialog.showSaveDialog(win, opts) : await dialog.showSaveDialog(opts)
  if (res.canceled || !res.filePath) return null

  // VACUUM INTO 生成一致性快照,不受 WAL 影响
  const snap = join(tmpdir(), `codelearn-snap-${randomUUID()}.db`)
  getDb().exec(`VACUUM INTO '${snap.replace(/'/g, "''")}'`)
  try {
    const images: Record<string, string> = {}
    for (const name of listImageFiles()) {
      if (!SAFE_NAME.test(name)) continue
      images[name] = readFileSync(join(getDataDir(), IMAGES_DIR, name)).toString('base64')
    }
    const body = JSON.stringify({
      app: 'CodeLearn',
      version: 1,
      exportedAt: Date.now(),
      db: readFileSync(snap).toString('base64'),
      images
    })
    writeFileSync(res.filePath, body)
    return res.filePath
  } finally {
    rmSync(snap, { force: true })
  }
}

interface ImportResult {
  problems: number
  images: number
}

/**
 * 从备份文件导入:【完全替换】当前数据。
 * 安全设计:导入前自动把现有库 + 图片复制到 pre-import-<时间戳>/ 保留;
 * 任何一步失败都会把旧数据挪回去并重新打开原库。
 */
export function importBackup(filePath: string): ImportResult {
  // 1) 读文件并严格校验(在关闭数据库之前,失败不动任何数据)
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(filePath, 'utf8'))
  } catch {
    throw new Error('文件不是有效的 CodeLearn 备份(JSON 解析失败)')
  }
  const obj = raw as { app?: unknown; version?: unknown; db?: unknown; images?: unknown }
  if (obj.app !== 'CodeLearn' || obj.version !== 1) throw new Error('不是 CodeLearn 备份文件,或版本不兼容')
  if (typeof obj.db !== 'string' || !obj.db) throw new Error('备份缺少数据库内容')
  if (typeof obj.images !== 'object' || obj.images === null || Array.isArray(obj.images)) {
    throw new Error('备份的图片列表损坏')
  }
  const imgEntries = Object.entries(obj.images as Record<string, unknown>)
  for (const [name, b64] of imgEntries) {
    if (!SAFE_NAME.test(name) || typeof b64 !== 'string') throw new Error(`备份含非法图片项:${name}`)
  }

  // 2) 关库 → 备份旧数据 → 换入新数据
  const dir = getDataDir()
  const dbPath = join(dir, DB_FILE)
  const imgPath = join(dir, IMAGES_DIR)
  const oldDir = join(dir, `pre-import-${Date.now()}`)
  closeDb()
  try {
    mkdirSync(oldDir, { recursive: true })
    if (existsSync(dbPath)) cpSync(dbPath, join(oldDir, DB_FILE))
    if (existsSync(imgPath)) cpSync(imgPath, join(oldDir, IMAGES_DIR), { recursive: true })

    rmSync(dbPath, { force: true })
    rmSync(`${dbPath}-wal`, { force: true })
    rmSync(`${dbPath}-shm`, { force: true })
    rmSync(imgPath, { recursive: true, force: true })

    writeFileSync(dbPath, Buffer.from(obj.db, 'base64'))
    mkdirSync(imgPath, { recursive: true })
    let images = 0
    for (const [name, b64] of imgEntries) {
      if (typeof b64 !== 'string') continue
      writeFileSync(join(imgPath, name), Buffer.from(b64, 'base64'))
      images++
    }

    reopen()
    const { n } = getDb().prepare('SELECT COUNT(*) AS n FROM problems').get() as { n: number }
    return { problems: n, images }
  } catch (err) {
    // 3) 回滚:恢复旧数据并重新打开
    try {
      closeDb()
      if (existsSync(join(oldDir, DB_FILE))) {
        rmSync(dbPath, { force: true })
        cpSync(join(oldDir, DB_FILE), dbPath)
      }
      if (existsSync(join(oldDir, IMAGES_DIR))) {
        rmSync(imgPath, { recursive: true, force: true })
        cpSync(join(oldDir, IMAGES_DIR), imgPath, { recursive: true })
      }
    } catch (e2) {
      console.error('[backup] rollback failed', e2)
    }
    reopen()
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`导入失败,已恢复原数据:${msg}`)
  }
}
