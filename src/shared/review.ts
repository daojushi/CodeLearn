/**
 * 复习曲线:跨进程共享的常量与纯函数(主进程排期 / 渲染进程预览共用)。
 * 注意:此文件被 node 与 web 两个 tsconfig 同时包含,只能放纯逻辑,
 * 不要引用 electron / node 运行时模块。
 */
import type { ReviewResult } from './types'

/** 默认曲线(spec §18):1 → 3 → 7 → 14 → 30 天 */
export const DEFAULT_REVIEW_CURVE: number[] = [1, 3, 7, 14, 30]

/** 内置预设:点一下填充编辑器,用户仍可在此基础上继续改 */
export const REVIEW_CURVE_PRESETS: { name: string; days: number[] }[] = [
  { name: '标准', days: [1, 3, 7, 14, 30] },
  { name: '密集', days: [1, 2, 4, 7, 15] },
  { name: '长期', days: [2, 7, 30, 90] }
]

export const CURVE_MIN_STAGES = 1
export const CURVE_MAX_STAGES = 20
export const CURVE_MAX_DAYS = 3650

export interface ReviewCurveCheck {
  /** 校验通过时的归一化曲线,否则 null */
  curve: number[] | null
  /** 校验失败的原因(可直接展示给用户) */
  error: string | null
}

/**
 * 校验一条曲线:整数、逐档严格递增、1~20 档、每档 1~3650 天。
 * 主进程用它做权威校验,渲染进程用同一个函数做实时校验与禁用保存 ——
 * 共用是刻意的:保证弹层里显示的间隔就是主进程真正会排的时间。
 * 入参是 unknown:可能来自 IPC,也可能来自输入框(数字字符串)。
 */
export function validateReviewCurve(value: unknown): ReviewCurveCheck {
  if (!Array.isArray(value)) return { curve: null, error: '复习曲线格式不对' }
  if (value.length < CURVE_MIN_STAGES) {
    return { curve: null, error: `至少要保留 ${CURVE_MIN_STAGES} 档` }
  }
  if (value.length > CURVE_MAX_STAGES) {
    return { curve: null, error: `最多 ${CURVE_MAX_STAGES} 档` }
  }

  const curve: number[] = []
  for (let i = 0; i < value.length; i++) {
    const raw: unknown = value[i]
    const n = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isInteger(n)) return { curve: null, error: `第 ${i + 1} 档的天数要填整数` }
    if (n < 1 || n > CURVE_MAX_DAYS) {
      return { curve: null, error: `第 ${i + 1} 档的天数需在 1 ~ ${CURVE_MAX_DAYS} 之间` }
    }
    const prev = curve[i - 1]
    if (prev !== undefined && n <= prev) {
      return { curve: null, error: `第 ${i + 1} 档(${n} 天)必须大于第 ${i} 档(${prev} 天)` }
    }
    curve.push(n)
  }
  return { curve, error: null }
}

/** 把档位收进 [0, curveLength - 1];曲线被改短后,越界档位收敛到最后一档 */
export function clampReviewStage(stage: number, curveLength: number): number {
  if (!Number.isFinite(stage)) return 0
  return Math.min(Math.max(Math.trunc(stage), 0), curveLength - 1)
}

/**
 * 四档反馈如何推进档位(与历史硬编码行为一致,只是档数由曲线决定):
 *   忘了 Forgot → 退回第 1 档
 *   有点难 Hard → 原地重复当前档
 *   会了 Solved → 进一档
 *   轻松 Easy   → 跳两档
 * 一律 clamp,不会越界(curveLength 必须是 ≥1 的有效长度)。
 */
export function nextStageFor(
  result: ReviewResult,
  stage: number,
  curveLength: number
): number {
  const from = clampReviewStage(stage, curveLength)
  if (result === 'forgot') return 0
  if (result === 'hard') return from
  return clampReviewStage(from + (result === 'easy' ? 2 : 1), curveLength)
}
