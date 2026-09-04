import { app } from 'electron'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * 数据目录(数据库 + images/)的位置管理。
 * 用户可在 Settings 中把数据改存到其它盘;选择记录在 userData/settings.json ——
 * 配置文件刻意不放进数据目录内,否则迁移后就找不到自己了。
 */

const SETTINGS_FILE = 'settings.json'
const DB_FILE = 'codelearn.db'
const IMAGES_DIR = 'images'

let dataDir = ''

function settingsPath(): string {
  return join(app.getPath('userData'), SETTINGS_FILE)
}

function sameDir(a: string, b: string): boolean {
  const norm = (p: string): string => {
    const r = resolve(p).replace(/[\\/]+$/, '')
    return process.platform === 'win32' ? r.toLowerCase() : r
  }
  return norm(a) === norm(b)
}

/** 启动时调用一次:settings.json 里用户指定过位置就生效,否则默认 userData */
export function resolveDataDir(): string {
  dataDir = app.getPath('userData')
  try {
    const cfg = JSON.parse(readFileSync(settingsPath(), 'utf8')) as { dataDir?: unknown }
    if (typeof cfg.dataDir === 'string' && cfg.dataDir.trim()) {
      const dir = resolve(cfg.dataDir)
      if (existsSync(dir)) {
        dataDir = dir
      } else {
        console.warn(`[storage] 配置的数据目录不存在,回退到默认:${dir}`)
      }
    }
  } catch {
    // 首次运行 / 配置文件缺失或损坏 → 默认位置
  }
  return dataDir
}

export function getDataDir(): string {
  return dataDir || app.getPath('userData')
}

/**
 * 把数据迁移到 target(调用方需先 closeDb 释放句柄):
 * 复制 codelearn.db + images/ → 写 settings.json → 切换生效。
 * 原目录的文件全部保留,便于确认新位置正常后回退或手动清理。
 * 任一步失败即抛错,settings.json 未写入,当前仍指向原目录。
 */
export function moveDataDir(targetRaw: string): string {
  const from = getDataDir()
  const target = resolve(targetRaw.trim())
  if (!target) throw new Error('请选择数据目录')
  if (sameDir(target, from)) return from

  if (!existsSync(join(from, DB_FILE))) {
    throw new Error(`当前数据目录缺少 ${DB_FILE},无法迁移`)
  }
  mkdirSync(target, { recursive: true })

  // 目标里已有一份数据库 → 拒绝,避免覆盖未知数据
  if (existsSync(join(target, DB_FILE))) {
    throw new Error(`目标目录已存在 ${DB_FILE},请换一个空的文件夹`)
  }
  // 可写性探测(只读盘 / 无权限时会在这里抛错)
  const probe = join(target, '.codelearn-probe')
  writeFileSync(probe, 'ok')
  rmSync(probe, { force: true })

  cpSync(join(from, DB_FILE), join(target, DB_FILE))
  const fromImages = join(from, IMAGES_DIR)
  if (existsSync(fromImages)) {
    cpSync(fromImages, join(target, IMAGES_DIR), { recursive: true })
  }
  writeFileSync(settingsPath(), JSON.stringify({ dataDir: target }, null, 2))
  dataDir = target
  return target
}
