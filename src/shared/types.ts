/**
 * 跨进程共享类型与 IPC 频道名(主进程 / preload / 渲染进程共用)。
 * 注意:此文件被 node 与 web 两个 tsconfig 同时包含,只能放纯类型,
 * 不要引用 electron / node 运行时模块。
 */

/* ---------- 枚举常量 ---------- */

export const RANKS = ['S', 'A', 'B', 'C'] as const
export type Rank = (typeof RANKS)[number]

export const STATUSES = [
  'not_started',
  'attempting',
  'solved',
  'need_review',
  'mastered'
] as const
export type ProblemStatus = (typeof STATUSES)[number]

export const REVIEW_RESULTS = ['forgot', 'hard', 'solved', 'easy'] as const
export type ReviewResult = (typeof REVIEW_RESULTS)[number]

/* ---------- 实体(数据库行,字段已 camelCase 别名化) ---------- */

export interface Problem {
  id: number
  title: string
  rank: Rank
  status: ProblemStatus
  inspiration: string
  note: string
  reviewStage: number
  lastReviewedAt: number | null
  nextReviewAt: number | null
  reviewCount: number
  createdAt: number
  updatedAt: number
}

export interface ContentBlock {
  id: number
  problemId: number
  position: number
  type: 'text' | 'image'
  text: string | null
  imageFilename: string | null
}

export interface KnowledgePoint {
  id: number
  name: string
  description: string
  category: string | null
  createdAt: number
  updatedAt: number
}

export interface MistakePreset {
  id: number
  name: string
  isBuiltIn: boolean
}

export interface LanguagePreset {
  id: number
  name: string
  isBuiltIn: boolean
}

export interface Solution {
  id: number
  problemId: number
  title: string
  description: string
  languageId: number | null
  languageName: string | null
  code: string
  createdAt: number
  updatedAt: number
}

export interface Review {
  id: number
  problemId: number
  result: ReviewResult
  reviewedAt: number
  nextReviewAt: number
}

/* ---------- UI 用组合结构 ---------- */

/** 列表中聚合了知识点名 / 错误原因名 / 最近一次复习结果 */
export interface ProblemListItem extends Problem {
  kpNames: string[]
  mistakeNames: string[]
  /** 最近一次复习结果(从未复习过为 null) */
  lastReviewResult: ReviewResult | null
}

/** 详情页全量数据 */
export interface ProblemDetail extends Problem {
  blocks: ContentBlock[]
  knowledgePoints: KnowledgePoint[]
  mistakes: MistakePreset[]
  solutions: Solution[]
}

export interface KnowledgePointWithCount extends KnowledgePoint {
  problemCount: number
}

/* ---------- IPC 入参 ---------- */

export interface ProblemPatch {
  title?: string
  rank?: Rank
  status?: ProblemStatus
  inspiration?: string
  note?: string
}

export interface ContentBlockDraft {
  type: 'text' | 'image'
  /** type=text 时的内容 */
  text?: string
  /** type=image 时的 data URL(base64) */
  dataUrl?: string
}

export interface ProblemDraft {
  title: string
  rank: Rank
  status: ProblemStatus
  blocks: ContentBlockDraft[]
  knowledgePointIds: number[]
}

export interface SolutionDraft {
  title: string
  description: string
  languageId: number | null
  code: string
}

/** Knowledge Point 元信息补丁;category 传 null 表示清除分类 */
export interface KnowledgePatch {
  description?: string
  category?: string | null
}

export interface PingResult {
  pong: boolean
  sqliteVersion: string
}

/* ---------- IPC 频道表 ---------- */

export const IPC = {
  ping: 'app:ping',

  problemsList: 'problems:list',
  problemsGet: 'problems:get',
  problemsCreate: 'problems:create',
  problemsUpdate: 'problems:update',
  problemsRemove: 'problems:remove',
  problemsAddBlock: 'problems:addBlock',
  problemsDeleteBlock: 'problems:deleteBlock',
  problemsAddKnowledge: 'problems:addKnowledge',
  problemsRemoveKnowledge: 'problems:removeKnowledge',
  problemsAddMistake: 'problems:addMistake',
  problemsRemoveMistake: 'problems:removeMistake',

  knowledgeListAll: 'knowledge:listAll',
  knowledgeGet: 'knowledge:get',
  knowledgeGetOrCreate: 'knowledge:getOrCreate',
  knowledgeRename: 'knowledge:rename',
  knowledgeRemove: 'knowledge:remove',
  knowledgeUpdate: 'knowledge:update',

  presetsMistakeList: 'presets:mistakeList',
  presetsMistakeAdd: 'presets:mistakeAdd',
  presetsMistakeRename: 'presets:mistakeRename',
  presetsMistakeRemove: 'presets:mistakeRemove',
  presetsLanguageList: 'presets:languageList',
  presetsLanguageAdd: 'presets:languageAdd',
  presetsLanguageRename: 'presets:languageRename',
  presetsLanguageRemove: 'presets:languageRemove',

  solutionsAdd: 'solutions:add',
  solutionsUpdate: 'solutions:update',
  solutionsRemove: 'solutions:remove',

  reviewsDue: 'reviews:due',
  reviewsList: 'reviews:list',
  reviewsSubmit: 'reviews:submit',

  imagesGet: 'images:get',

  dataDirGet: 'storage:dataDirGet',
  dataDirChoose: 'storage:dataDirChoose',
  dataDirSet: 'storage:dataDirSet',
  dataDirOpen: 'storage:dataDirOpen',

  backupExport: 'backup:export',
  backupImportChoose: 'backup:importChoose',
  backupImportRun: 'backup:importRun'
} as const

/** preload 通过 contextBridge 暴露给 window.api 的全部能力 */
export interface Api {
  ping(): Promise<PingResult>

  problemsList(): Promise<ProblemListItem[]>
  problemGet(id: number): Promise<ProblemDetail | null>
  problemCreate(draft: ProblemDraft): Promise<Problem>
  problemUpdate(id: number, patch: ProblemPatch): Promise<void>
  problemRemove(id: number): Promise<void>
  problemAddBlock(id: number, draft: ContentBlockDraft): Promise<ContentBlock>
  problemDeleteBlock(blockId: number): Promise<void>
  problemAddKnowledge(problemId: number, kpId: number): Promise<void>
  problemRemoveKnowledge(problemId: number, kpId: number): Promise<void>
  problemAddMistake(problemId: number, presetId: number): Promise<void>
  problemRemoveMistake(problemId: number, presetId: number): Promise<void>

  knowledgeListAll(): Promise<KnowledgePointWithCount[]>
  knowledgeGet(id: number): Promise<KnowledgePointWithCount | null>
  knowledgeGetOrCreate(name: string): Promise<KnowledgePoint>
  knowledgeRename(id: number, name: string): Promise<void>
  knowledgeRemove(id: number): Promise<void>
  knowledgeUpdate(id: number, patch: KnowledgePatch): Promise<void>

  mistakePresetsList(): Promise<MistakePreset[]>
  mistakePresetAdd(name: string): Promise<MistakePreset>
  mistakePresetRename(id: number, name: string): Promise<void>
  mistakePresetRemove(id: number): Promise<void>
  languagePresetsList(): Promise<LanguagePreset[]>
  languagePresetAdd(name: string): Promise<LanguagePreset>
  languagePresetRename(id: number, name: string): Promise<void>
  languagePresetRemove(id: number): Promise<void>

  solutionAdd(problemId: number, draft: SolutionDraft): Promise<Solution>
  solutionUpdate(solutionId: number, draft: SolutionDraft): Promise<void>
  solutionRemove(solutionId: number): Promise<void>

  /** Today 到期队列(已排期且到期、未掌握) */
  reviewDue(): Promise<ProblemListItem[]>
  /** 某题复习历史(新 → 旧) */
  reviewList(problemId: number): Promise<Review[]>
  /** 提交复习结果并自动排下一次,返回落库的 Review */
  reviewSubmit(problemId: number, result: ReviewResult): Promise<Review>

  imageGet(filename: string): Promise<string>

  /** 当前数据目录(存放 codelearn.db 与 images/) */
  dataDirGet(): Promise<string>
  /** 弹系统目录选择框;取消返回 null */
  dataDirChoose(): Promise<string | null>
  /** 把数据迁到 dir(自动复制,成功后返回最终生效目录) */
  dataDirSet(dir: string): Promise<string>
  /** 在系统文件管理器中打开数据目录 */
  dataDirOpen(): Promise<void>

  /** 导出全量备份(另存对话框);取消返回 null,成功返回文件路径 */
  backupExport(): Promise<string | null>
  /** 打开备份文件选择框;取消返回 null,成功返回路径 */
  backupImportChoose(): Promise<string | null>
  /** 用备份替换当前数据(导入前自动保留旧数据在 pre-import-* 文件夹) */
  backupImportRun(filePath: string): Promise<{ problems: number; images: number }>
}
