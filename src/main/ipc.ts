import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import {
  IPC,
  type ContentBlockDraft,
  type KnowledgePatch,
  type PingResult,
  type ProblemPatch,
  type ReviewResult,
  type SolutionDraft
} from '../shared/types'
import { validateReviewCurve } from '../shared/review'
import { closeDb, getDb, initDatabase } from './db/connection'
import { runMigrations } from './db/migrations'
import { applyReviewCurve, getReviewCurve } from './db/curve'
import { exportBackup, importBackup } from './backup'
import { getDataDir, moveDataDir } from './storage'
import {
  addBlock,
  addProblemKnowledge,
  addProblemMistake,
  createProblem,
  deleteBlock,
  getProblemDetail,
  listProblems,
  removeProblem,
  removeProblemKnowledge,
  removeProblemMistake,
  updateProblem
} from './db/problems'
import {
  getKnowledgePoint,
  getOrCreateKnowledgePoint,
  listKnowledgePoints,
  removeKnowledgePoint,
  renameKnowledgePoint,
  updateKnowledgePoint
} from './db/knowledge'
import {
  addLanguagePreset,
  addMistakePreset,
  listLanguagePresets,
  listMistakePresets,
  removeLanguagePreset,
  removeMistakePreset,
  renameLanguagePreset,
  renameMistakePreset
} from './db/presets'
import { addSolution, removeSolution, updateSolution } from './db/solutions'
import { listDueProblems, listReviews, submitReview } from './db/reviews'
import { initImagesDir, readImage } from './images'

/** 注册全部 IPC handlers;每个 handler 内做入参基础校验 */
export function registerIpc(): void {
  ipcMain.handle(IPC.ping, (): PingResult => {
    const row = getDb().prepare('SELECT sqlite_version() AS v').get() as { v: string }
    return { pong: true, sqliteVersion: row.v }
  })

  /* ---------- Problems ---------- */
  ipcMain.handle(IPC.problemsList, () => listProblems())
  ipcMain.handle(IPC.problemsGet, (_e, id: unknown) => getProblemDetail(asInt(id, 'problem id')))
  ipcMain.handle(IPC.problemsCreate, (_e, draft: unknown) => createProblem(validateDraft(draft)))
  ipcMain.handle(IPC.problemsUpdate, (_e, id: unknown, patch: unknown) =>
    updateProblem(asInt(id, 'problem id'), patch as ProblemPatch)
  )
  ipcMain.handle(IPC.problemsRemove, (_e, id: unknown) => removeProblem(asInt(id, 'problem id')))
  ipcMain.handle(IPC.problemsAddBlock, (_e, id: unknown, draft: unknown) =>
    addBlock(asInt(id, 'problem id'), draft as ContentBlockDraft)
  )
  ipcMain.handle(IPC.problemsDeleteBlock, (_e, blockId: unknown) =>
    deleteBlock(asInt(blockId, 'block id'))
  )
  ipcMain.handle(IPC.problemsAddKnowledge, (_e, problemId: unknown, kpId: unknown) =>
    addProblemKnowledge(asInt(problemId, 'problem id'), asInt(kpId, 'kp id'))
  )
  ipcMain.handle(IPC.problemsRemoveKnowledge, (_e, problemId: unknown, kpId: unknown) =>
    removeProblemKnowledge(asInt(problemId, 'problem id'), asInt(kpId, 'kp id'))
  )
  ipcMain.handle(IPC.problemsAddMistake, (_e, problemId: unknown, presetId: unknown) =>
    addProblemMistake(asInt(problemId, 'problem id'), asInt(presetId, 'preset id'))
  )
  ipcMain.handle(IPC.problemsRemoveMistake, (_e, problemId: unknown, presetId: unknown) =>
    removeProblemMistake(asInt(problemId, 'problem id'), asInt(presetId, 'preset id'))
  )

  /* ---------- Knowledge Points ---------- */
  ipcMain.handle(IPC.knowledgeListAll, () => listKnowledgePoints())
  ipcMain.handle(IPC.knowledgeGet, (_e, id: unknown) =>
    getKnowledgePoint(asInt(id, 'kp id'))
  )
  ipcMain.handle(IPC.knowledgeGetOrCreate, (_e, name: unknown) =>
    getOrCreateKnowledgePoint(asString(name, 'kp name'))
  )
  ipcMain.handle(IPC.knowledgeRename, (_e, id: unknown, name: unknown) =>
    renameKnowledgePoint(asInt(id, 'kp id'), asString(name, 'kp name'))
  )
  ipcMain.handle(IPC.knowledgeRemove, (_e, id: unknown) =>
    removeKnowledgePoint(asInt(id, 'kp id'))
  )
  ipcMain.handle(IPC.knowledgeUpdate, (_e, id: unknown, patch: unknown) =>
    updateKnowledgePoint(asInt(id, 'kp id'), patch as KnowledgePatch)
  )

  /* ---------- Presets ---------- */
  ipcMain.handle(IPC.presetsMistakeList, () => listMistakePresets())
  ipcMain.handle(IPC.presetsMistakeAdd, (_e, name: unknown) =>
    addMistakePreset(asString(name, 'mistake name'))
  )
  ipcMain.handle(IPC.presetsMistakeRename, (_e, id: unknown, name: unknown) =>
    renameMistakePreset(asInt(id, 'preset id'), asString(name, 'mistake name'))
  )
  ipcMain.handle(IPC.presetsMistakeRemove, (_e, id: unknown) =>
    removeMistakePreset(asInt(id, 'preset id'))
  )
  ipcMain.handle(IPC.presetsLanguageList, () => listLanguagePresets())
  ipcMain.handle(IPC.presetsLanguageAdd, (_e, name: unknown) =>
    addLanguagePreset(asString(name, 'language name'))
  )
  ipcMain.handle(IPC.presetsLanguageRename, (_e, id: unknown, name: unknown) =>
    renameLanguagePreset(asInt(id, 'preset id'), asString(name, 'language name'))
  )
  ipcMain.handle(IPC.presetsLanguageRemove, (_e, id: unknown) =>
    removeLanguagePreset(asInt(id, 'preset id'))
  )

  /* ---------- Solutions ---------- */
  ipcMain.handle(IPC.solutionsAdd, (_e, problemId: unknown, draft: unknown) =>
    addSolution(asInt(problemId, 'problem id'), draft as SolutionDraft)
  )
  ipcMain.handle(IPC.solutionsUpdate, (_e, solutionId: unknown, draft: unknown) =>
    updateSolution(asInt(solutionId, 'solution id'), draft as SolutionDraft)
  )
  ipcMain.handle(IPC.solutionsRemove, (_e, solutionId: unknown) =>
    removeSolution(asInt(solutionId, 'solution id'))
  )

  /* ---------- Reviews ---------- */
  ipcMain.handle(IPC.reviewsDue, () => listDueProblems())
  ipcMain.handle(IPC.reviewsList, (_e, problemId: unknown) =>
    listReviews(asInt(problemId, 'problem id'))
  )
  ipcMain.handle(IPC.reviewsSubmit, (_e, problemId: unknown, result: unknown) =>
    submitReview(asInt(problemId, 'problem id'), result as ReviewResult)
  )
  ipcMain.handle(IPC.reviewsCurveGet, () => getReviewCurve())
  ipcMain.handle(IPC.reviewsCurveSet, (_e, days: unknown) => {
    // 主进程是权威校验;渲染进程复用同一个函数只是为了实时提示
    const { curve, error } = validateReviewCurve(days)
    if (!curve) throw new Error(error ?? '复习曲线不合法')
    return applyReviewCurve(curve)
  })

  /* ---------- Images ---------- */
  ipcMain.handle(IPC.imagesGet, (_e, filename: unknown) =>
    readImage(asString(filename, 'image filename'))
  )

  /* ---------- Storage:数据目录 ---------- */
  ipcMain.handle(IPC.dataDirGet, () => getDataDir())

  ipcMain.handle(IPC.dataDirChoose, async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const opts: Electron.OpenDialogOptions = {
      title: '选择 CodeLearn 数据存放位置',
      buttonLabel: '存到这里',
      properties: ['openDirectory', 'createDirectory']
    }
    const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    return res.canceled ? null : (res.filePaths[0] ?? null)
  })

  ipcMain.handle(IPC.dataDirSet, (_e, dir: unknown) => {
    const from = getDataDir()
    const target = typeof dir === 'string' ? dir.trim() : ''
    if (!target) throw new Error('请选择数据目录')

    // 迁移全程同步执行(main 单线程),期间无其它 DB 访问;先关连接释放句柄
    closeDb()
    let next: string
    try {
      next = moveDataDir(target)
    } catch (err) {
      // 失败回滚:仍从原位置重新打开,应用保持可用
      reopenDb(from)
      throw err
    }
    try {
      reopenDb(next)
    } catch (err) {
      console.error('[storage] reopen failed,请重启应用', err)
      throw err
    }
    return next
  })

  ipcMain.handle(IPC.dataDirOpen, async () => {
    const errMsg = await shell.openPath(getDataDir())
    if (errMsg) throw new Error(`无法打开文件夹:${errMsg}`)
  })

  /* ---------- Backup:全量备份导出 / 导入 ---------- */
  ipcMain.handle(IPC.backupExport, (e) =>
    exportBackup(BrowserWindow.fromWebContents(e.sender))
  )
  ipcMain.handle(IPC.backupImportChoose, async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const opts: Electron.OpenDialogOptions = {
      title: '选择要导入的 CodeLearn 备份',
      properties: ['openFile'],
      filters: [{ name: 'CodeLearn 备份', extensions: ['json'] }]
    }
    const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    return res.canceled ? null : (res.filePaths[0] ?? null)
  })
  ipcMain.handle(IPC.backupImportRun, (_e, filePath: unknown) => {
    if (typeof filePath !== 'string' || !filePath.trim()) throw new Error('请选择备份文件')
    return importBackup(filePath)
  })
}

/** 按某数据目录重新初始化数据库连接与图片目录 */
function reopenDb(dir: string): void {
  initDatabase(join(dir, 'codelearn.db'))
  // 与 backup.ts 的 reopen 同理:目标库可能是旧版本,补跑迁移再交回业务层
  runMigrations()
  initImagesDir(join(dir, 'images'))
}

/* ---------- 基础入参校验 ---------- */

function asInt(value: unknown, label: string): number {
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) throw new Error(`invalid ${label}: ${String(value)}`)
  return n
}

function asString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`invalid ${label}`)
  return value
}

function validateDraft(draft: unknown) {
  if (typeof draft !== 'object' || draft === null) throw new Error('invalid problem draft')
  const d = draft as { title?: unknown; rank?: unknown; status?: unknown }
  if (typeof d.title !== 'string' || !d.title.trim()) throw new Error('标题不能为空')
  if (typeof d.rank !== 'string' || !['S', 'A', 'B', 'C'].includes(d.rank))
    throw new Error('rank 不合法')
  if (typeof d.status !== 'string') throw new Error('status 不合法')
  return draft as Parameters<typeof createProblem>[0]
}
