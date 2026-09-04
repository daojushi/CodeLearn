import { mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

/**
 * 题目截图等图片以文件形式存放于 userData/images/,
 * DB 中只记录文件名(content_blocks.image_filename)。
 */

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif'
}

let imagesDir = ''

export function initImagesDir(dir: string): void {
  imagesDir = dir
  mkdirSync(dir, { recursive: true })
}

/** 接受 "data:image/png;base64,...." 格式,落盘后返回文件名 */
export function saveImage(dataUrl: string): string {
  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/s.exec(dataUrl)
  if (!match) throw new Error('[images] unsupported image data url')
  const mime = match[1]
  const ext = mime === 'image/jpeg' ? 'jpg' : mime.replace('image/', '')
  const filename = `${randomUUID()}.${ext}`
  writeFileSync(join(imagesDir, filename), Buffer.from(match[2], 'base64'))
  return filename
}

export function deleteImage(filename: string): void {
  try {
    unlinkSync(join(imagesDir, filename))
  } catch {
    // 文件不存在时忽略(允许删除 DB 行)
  }
}

/** 列出全部已保存的图片文件名(目录缺失返回空) */
export function listImageFiles(): string[] {
  try {
    return readdirSync(imagesDir)
  } catch {
    return []
  }
}

/** 读出为 data URL,供渲染进程 <img> 直接使用 */
export function readImage(filename: string): string {
  const ext = filename.includes('.') ? filename.split('.').pop()! : ''
  const mime = MIME_BY_EXT[ext] ?? 'image/png'
  const buf = readFileSync(join(imagesDir, filename))
  return `data:${mime};base64,${buf.toString('base64')}`
}
