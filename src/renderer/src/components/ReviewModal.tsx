import { useEffect, useState } from 'react'
import { Eye, EyeOff, X, ZoomIn } from 'lucide-react'
import type { ProblemDetail as ProblemDetailType, ReviewResult } from '../../../shared/types'
import { nextStageFor } from '../../../shared/review'
import { REVIEW_LABELS } from '../lib/constants'
import BlockImage from './BlockImage'
import CodeBlock from './CodeBlock'
import MarkdownText from './MarkdownText'
import ZoomedViewer from './ZoomedViewer'
import { btnGhost, RankBadge } from './ui'

/** 四档反馈按钮配色(spec §18 How did it go?) */
const RESULT_STYLES: Record<ReviewResult, string> = {
  forgot: 'border-rose-200 text-rose-600 hover:bg-rose-50',
  hard: 'border-amber-200 text-amber-600 hover:bg-amber-50',
  solved: 'border-sky-200 text-sky-600 hover:bg-sky-50',
  easy: 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
}

/**
 * 复习弹层:先看题目在脑子里重做 → 默认折叠题解/灵感(避免看着答案自我欺骗)
 * → 四档反馈。提交成功后回调 onReviewed 由调用方刷新队列/详情。
 */
export default function ReviewModal({
  problemId,
  onClose,
  onReviewed
}: {
  problemId: number
  onClose: () => void
  onReviewed: () => void
}): React.JSX.Element {
  const [problem, setProblem] = useState<ProblemDetailType | null>(null)
  const [curve, setCurve] = useState<number[] | null>(null)
  const [reveal, setReveal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reader, setReader] = useState(false)

  useEffect(() => {
    let alive = true
    // 曲线用于把「四档反馈」翻译成这道题真实的下次间隔,与主进程共用 nextStageFor
    Promise.all([window.api.problemGet(problemId), window.api.reviewCurveGet()])
      .then(([p, c]) => {
        if (!alive) return
        setProblem(p)
        setCurve(c)
      })
      .catch(console.error)
    return () => {
      alive = false
    }
  }, [problemId])

  /** 该反馈排出的下次间隔;曲线/题目未就绪时为 null(退化成纯按钮文案) */
  function outcomeText(result: ReviewResult): string | null {
    if (!curve || !problem) return null
    const next = nextStageFor(result, problem.reviewStage, curve.length)
    const days = curve[next]
    // 已在最后一档时「会了 / 轻松」进不了档,明说一句,免得以为没生效
    const atTop = result !== 'forgot' && result !== 'hard' && next === problem.reviewStage
    return atTop ? `已最长 · ${days} 天后` : `${days} 天后`
  }

  async function submit(result: ReviewResult): Promise<void> {
    if (busy) return
    setBusy(true)
    try {
      await window.api.reviewSubmit(problemId, result)
      onReviewed()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={onClose}>
      <div
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-6 pb-3 pt-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {problem && <RankBadge rank={problem.rank} />}
              <h2 className="break-words text-base font-semibold text-zinc-900">
                {problem ? problem.title : '加载中…'}
              </h2>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              先在脑子里过一遍怎么做,再点「看看当时」对照答案
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setReader(true)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              title="放大阅读题目"
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              title="关闭"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 题目内容 + (可选)折叠的灵感/题解 */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
          {problem ? (
            <>
              {problem.blocks.length === 0 && (
                <p className="text-xs text-zinc-400">这道题没有记录正文,凭标题回忆吧。</p>
              )}
              {problem.blocks.map((b) =>
                b.type === 'image' && b.imageFilename ? (
                  <BlockImage key={b.id} filename={b.imageFilename} />
                ) : (
                  <p
                    key={b.id}
                    className="whitespace-pre-wrap rounded-md border border-zinc-200 bg-zinc-50/60 p-3 font-mono text-[13px] leading-relaxed text-zinc-800"
                  >
                    {b.text}
                  </p>
                )
              )}
              <button
                type="button"
                className={`${btnGhost} flex items-center gap-1.5 text-xs`}
                onClick={() => setReveal((v) => !v)}
              >
                {reveal ? <EyeOff size={13} /> : <Eye size={13} />}
                {reveal ? '收起答案' : '看看当时(灵感 · 题解)'}
              </button>
              {reveal && (
                <div className="space-y-3 border-t border-dashed border-zinc-200 pt-3">
                  <div>
                    <p className="mb-1 text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
                      灵感启迪
                    </p>
                    {problem.inspiration ? (
                      <MarkdownText
                        source={problem.inspiration}
                        className="rounded-md border border-zinc-200 bg-white p-3 text-zinc-700"
                      />
                    ) : (
                      <p className="rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-300">
                        没有记录
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
                      当时题解
                    </p>
                    {problem.solutions.length === 0 ? (
                      <p className="rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-300">
                        没有题解
                      </p>
                    ) : (
                      problem.solutions.map((s) => (
                        <div key={s.id} className="mb-2">
                          <p className="mb-1 text-xs text-zinc-500">
                            {s.title}
                            {s.languageName ? ` · ${s.languageName}` : ''}
                          </p>
                          {s.code && <CodeBlock code={s.code} language={s.languageName} />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="py-10 text-center text-sm text-zinc-400">加载中…</p>
          )}
        </div>

        {/* 反馈区 */}
        <div className="border-t border-zinc-100 bg-zinc-50/50 px-6 py-4">
          <p className="mb-2 text-xs font-medium text-zinc-600">How did it go?</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(REVIEW_LABELS) as ReviewResult[]).map((r) => {
              const outcome = outcomeText(r)
              return (
                <button
                  key={r}
                  type="button"
                  disabled={busy || !problem}
                  onClick={() => void submit(r)}
                  className={`rounded-lg border bg-white px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${RESULT_STYLES[r]}`}
                >
                  {REVIEW_LABELS[r]}
                  {outcome && (
                    <span className="ml-1.5 text-[11px] font-normal opacity-70">{outcome}</span>
                  )}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-[11px] text-zinc-400">
            {curve
              ? '按你的复习曲线排期,可在 Settings 的「复习曲线」里调整'
              : '忘了回到第 1 档 · 有点难重复当前档 · 会了进一档 · 轻松跳两档'}
          </p>
        </div>
      </div>
      {reader && problem && (
        <ZoomedViewer title={problem.title} blocks={problem.blocks} onClose={() => setReader(false)} />
      )}
    </div>
  )
}
