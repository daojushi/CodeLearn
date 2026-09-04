import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Pencil, Trash2, ZoomIn } from 'lucide-react'
import type {
  ContentBlock,
  LanguagePreset,
  MistakePreset,
  ProblemDetail as ProblemDetailType,
  Review,
  Solution,
  SolutionDraft
} from '../../../shared/types'
import { btnGhost, btnPrimary, inputCls, RankSelect, Section, StatusSelect } from '../components/ui'
import BlockImage from '../components/BlockImage'
import KnowledgeChipsEditor from '../components/KnowledgeChipsEditor'
import CodeBlock from '../components/CodeBlock'
import MarkdownText from '../components/MarkdownText'
import ReviewModal from '../components/ReviewModal'
import ZoomedViewer from '../components/ZoomedViewer'
import { formatDate, REVIEW_LABELS } from '../lib/constants'

export default function ProblemDetail(): React.JSX.Element {
  const { id } = useParams()
  const problemId = Number(id)
  const navigate = useNavigate()

  const [detail, setDetail] = useState<ProblemDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingMeta, setEditingMeta] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editInspiration, setEditInspiration] = useState('')
  const [editNote, setEditNote] = useState('')
  const [addingSolution, setAddingSolution] = useState(false)
  const [editingSolution, setEditingSolution] = useState<Solution | null>(null)
  const [history, setHistory] = useState<Review[]>([])
  const [reviewing, setReviewing] = useState(false)
  const [reader, setReader] = useState(false)
  const zoneRef = useRef<HTMLDivElement>(null)

  const reload = useCallback(async () => {
    const d = await window.api.problemGet(problemId)
    setDetail(d)
    setLoading(false)
  }, [problemId])

  useEffect(() => {
    void reload().catch((err) => {
      console.error(err)
      setLoading(false)
    })
  }, [reload])

  // 复习历史(独立于详情,复习后单独刷新)
  const reloadHistory = useCallback(async () => {
    setHistory(await window.api.reviewList(problemId))
  }, [problemId])

  useEffect(() => {
    void reloadHistory().catch(console.error)
  }, [reloadHistory])

  if (loading) return <div className="p-10 text-sm text-zinc-400">加载中…</div>
  if (!detail) {
    return (
      <div className="p-10 text-sm text-zinc-400">
        题目不存在或已删除。<Link to="/problems" className="text-zinc-700 underline">返回列表</Link>
      </div>
    )
  }

  const checkedMistakeIds = new Set(detail.mistakes.map((m) => m.id))

  async function toggleMistake(preset: MistakePreset): Promise<void> {
    try {
      if (checkedMistakeIds.has(preset.id)) {
        await window.api.problemRemoveMistake(problemId, preset.id)
      } else {
        await window.api.problemAddMistake(problemId, preset.id)
      }
      await reload()
    } catch (err) {
      console.error(err)
    }
  }

  async function saveMeta(): Promise<void> {
    try {
      await window.api.problemUpdate(problemId, {
        title: editTitle,
        inspiration: editInspiration,
        note: editNote
      })
      setEditingMeta(false)
      await reload()
    } catch (err) {
      console.error(err)
    }
  }

  // 底部表单目标:优先「编辑某条题解」,其次「新增」;两者互斥
  const formTarget: Solution | null = addingSolution ? null : editingSolution

  // 注意:用 const 箭头(而非 function 声明),才能吃到上面 `if (!detail) return` 的类型收窄
  const startEdit = (): void => {
    setEditTitle(detail.title)
    setEditInspiration(detail.inspiration)
    setEditNote(detail.note)
    setEditingMeta(true)
  }

  function appendTextBlock(text: string): void {
    void window.api
      .problemAddBlock(problemId, { type: 'text', text })
      .then(reload)
      .catch(console.error)
  }

  function handlePaste(e: React.ClipboardEvent): void {
    const imageItem = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'))
    if (imageItem) {
      e.preventDefault()
      const file = imageItem.getAsFile()
      if (file) {
        const reader = new FileReader()
        reader.onload = () => {
          void window.api
            .problemAddBlock(problemId, { type: 'image', dataUrl: String(reader.result) })
            .then(reload)
            .catch(console.error)
        }
        reader.readAsDataURL(file)
      }
      return
    }
    if (e.target === zoneRef.current) {
      const text = e.clipboardData.getData('text/plain')
      if (text.trim()) {
        e.preventDefault()
        appendTextBlock(text)
      }
    }
  }

  const removeProblem = async (): Promise<void> => {
    if (!window.confirm(`确定删除「${detail.title}」?其下截图、题解与复习记录将一并删除。`)) return
    try {
      await window.api.problemRemove(problemId)
      navigate('/problems')
    } catch (err) {
      console.error(err)
    }
  }

  function BlockView({ block }: { block: ContentBlock }): React.JSX.Element {
    return (
      <div className="group relative rounded-md border border-zinc-200 bg-white p-3">
        <button
          type="button"
          onClick={() => {
            void window.api.problemDeleteBlock(block.id).then(reload).catch(console.error)
          }}
          className="absolute right-2 top-2 z-10 hidden rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-red-50 hover:text-red-600 group-hover:block"
          title="删除此块"
        >
          删除
        </button>
        {block.type === 'image' && block.imageFilename ? (
          <BlockImage filename={block.imageFilename} />
        ) : (
          <p className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-zinc-800">
            {block.text}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      {/* 头部:标题 + Rank + Status(spec §22) */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <RankSelect
            rank={detail.rank}
            onChange={(next) => {
              void window.api
                .problemUpdate(problemId, { rank: next })
                .then(reload)
                .catch(console.error)
            }}
          />
          <div className="min-w-0">
            {editingMeta ? (
              <input
                value={editTitle}
                className={`${inputCls} text-base font-semibold`}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            ) : (
              <h1
                className="cursor-pointer break-words text-xl font-semibold leading-snug hover:text-zinc-600"
                title="点击编辑标题"
                onClick={() => {
                  setEditTitle(detail.title)
                  setEditingMeta(true)
                }}
              >
                {detail.title}
              </h1>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusSelect
            status={detail.status}
            onChange={(next) => {
              void window.api
                .problemUpdate(problemId, { status: next })
                .then(reload)
                .catch(console.error)
            }}
          />
          <button
            type="button"
            onClick={() => void removeProblem()}
            className="rounded-md p-1.5 text-zinc-300 hover:bg-red-50 hover:text-red-500"
            title="删除题目"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Knowledge 关联(spec §10 双向链接) */}
      <div className="mt-3">
        <KnowledgeChipsEditor
          selected={detail.knowledgePoints}
          onAdd={(kp) => {
            void window.api.problemAddKnowledge(problemId, kp.id).then(reload).catch(console.error)
          }}
          onRemove={(kp) => {
            void window.api
              .problemRemoveKnowledge(problemId, kp.id)
              .then(reload)
              .catch(console.error)
          }}
          onOpen={(kp) => navigate(`/knowledge/${kp.id}`)}
        />
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-zinc-400">
        <Link to="/problems" className="hover:text-zinc-700">← Problems</Link>
        <span>创建于 {formatDate(detail.createdAt)}</span>
        {detail.lastReviewedAt && <span>上次复习 {formatDate(detail.lastReviewedAt)}</span>}
      </div>

      {/* 题目内容 */}
      <Section
        title="Problem"
        action={
          <button
            type="button"
            onClick={() => setReader(true)}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700"
            title="放大阅读题目"
          >
            <ZoomIn size={13} /> 放大
          </button>
        }
      >
        <div
          ref={zoneRef}
          onPaste={handlePaste}
          className="space-y-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/60 p-3"
        >
          {detail.blocks.length === 0 ? (
            <p className="px-1 py-2 text-center text-xs text-zinc-400">
              暂无题目内容 —— 在下方粘贴文字或截图(Ctrl+V)
            </p>
          ) : (
            detail.blocks.map((b) => <BlockView key={b.id} block={b} />)
          )}
          <p className="px-1 pb-0.5 text-[11px] text-zinc-400">在此区域粘贴可补充题目内容</p>
        </div>
      </Section>

      {/* Mistakes(spec §11-12) */}
      <Section title="Mistakes · 错误原因">
        <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-lg border border-zinc-200 bg-white p-4">
          <MistakePicker
            checked={checkedMistakeIds}
            problemId={problemId}
            onToggle={(p) => void toggleMistake(p)}
            onChanged={reload}
          />
        </div>
      </Section>

      {/* 灵感启迪(spec §14) */}
      <Section title="灵感启迪">
        {editingMeta ? (
          <textarea
            rows={3}
            value={editInspiration}
            placeholder="这道题给了我什么新的思考方式?…"
            className={`${inputCls} resize-y`}
            onChange={(e) => setEditInspiration(e.target.value)}
          />
        ) : (
          <div
            className="min-h-12 cursor-text rounded-md border border-zinc-200 bg-white p-3 text-sm leading-relaxed text-zinc-800"
            onClick={startEdit}
          >
            {detail.inspiration ? (
              <MarkdownText source={detail.inspiration} />
            ) : (
              <span className="text-zinc-300">还没有灵感 —— 点击补充</span>
            )}
          </div>
        )}
      </Section>

      {/* 备注(spec §13) */}
      <Section title="备注">
        {editingMeta ? (
          <textarea
            rows={4}
            value={editNote}
            placeholder="第一次尝试的思路、实现细节、边界问题或未来提醒…"
            className={`${inputCls} resize-y`}
            onChange={(e) => setEditNote(e.target.value)}
          />
        ) : (
          <div
            className="min-h-12 cursor-text rounded-md border border-zinc-200 bg-white p-3 text-sm leading-relaxed text-zinc-800"
            onClick={startEdit}
          >
            {detail.note ? (
              <MarkdownText source={detail.note} />
            ) : (
              <span className="text-zinc-300">还没有备注 —— 点击补充</span>
            )}
          </div>
        )}
        {editingMeta && (
          <div className="mt-2 flex gap-2">
            <button className={btnPrimary} onClick={() => void saveMeta()}>
              保存
            </button>
            <button className={btnGhost} onClick={() => setEditingMeta(false)}>
              取消
            </button>
          </div>
        )}
      </Section>

      {/* Review:复习状态 + 历史(spec §17-19) */}
      <Section title="Review · 复习">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-600">
            <span>
              {detail.lastReviewedAt
                ? `上次 ${formatDate(detail.lastReviewedAt)}${history[0] ? ` · ${REVIEW_LABELS[history[0].result]}` : ''}`
                : '还没复习过'}
            </span>
            <span className="text-zinc-300">|</span>
            <span>下次 {detail.nextReviewAt ? formatDate(detail.nextReviewAt) : '—'}</span>
            <span className="text-zinc-300">|</span>
            <span>已复习 {detail.reviewCount} 次</span>
            <button
              type="button"
              className={`${btnPrimary} ml-auto px-3 py-1.5 text-xs`}
              onClick={() => setReviewing(true)}
            >
              开始复习
            </button>
          </div>
          {history.length > 0 ? (
            <ol className="mt-3 divide-y divide-zinc-100 border-t border-zinc-100">
              {history.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-1.5 text-xs">
                  <span className="text-zinc-500">{formatDate(r.reviewedAt)}</span>
                  <span className="font-medium text-zinc-700">{REVIEW_LABELS[r.result]}</span>
                  <span className="ml-auto text-zinc-400">下次 {formatDate(r.nextReviewAt)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-xs text-zinc-400">
              复习后会在这里留下记录:忘了 → 1 天后;有点难 → 间隔不变;会了 → 间隔进一档;轻松 → 跳两档
            </p>
          )}
        </div>
      </Section>

      {/* Solutions(spec §15) */}
      <Section title="Solutions">
        <div className="space-y-3">
          {detail.solutions.map((s) => (
            <div key={s.id} className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-800">{s.title || '题解'}</span>
                  {s.languageName && (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-500">
                      {s.languageName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAddingSolution(false)
                      setEditingSolution(s)
                    }}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800"
                    title="编辑题解"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSolution((cur) => (cur?.id === s.id ? null : cur))
                      void window.api.solutionRemove(s.id).then(reload).catch(console.error)
                    }}
                    className="rounded p-1 text-zinc-300 hover:bg-red-50 hover:text-red-500"
                    title="删除题解"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {s.description && (
                <MarkdownText
                  source={s.description}
                  className="mb-2 text-sm leading-relaxed text-zinc-600"
                />
              )}
              {s.code && <CodeBlock code={s.code} language={s.languageName} />}
            </div>
          ))}
          {!addingSolution && !editingSolution ? (
            <button
              className={btnGhost}
              onClick={() => {
                setEditingSolution(null)
                setAddingSolution(true)
              }}
            >
              + Add Solution
            </button>
          ) : formTarget ? (
            <SolutionForm
              problemId={problemId}
              initial={formTarget}
              onClose={() => setEditingSolution(null)}
              onSaved={reload}
            />
          ) : (
            <SolutionForm
              problemId={problemId}
              onClose={() => setAddingSolution(false)}
              onSaved={reload}
            />
          )}
        </div>
      </Section>

      {reviewing && (
        <ReviewModal
          problemId={problemId}
          onClose={() => setReviewing(false)}
          onReviewed={() => {
            setReviewing(false)
            void reload()
            void reloadHistory()
          }}
        />
      )}

      {reader && (
        <ZoomedViewer
          title={detail.title}
          blocks={detail.blocks}
          onClose={() => setReader(false)}
        />
      )}
    </div>
  )
}

/* ---------- 子组件:错误原因多选 ---------- */

function MistakePicker({
  problemId,
  checked,
  onToggle,
  onChanged
}: {
  problemId: number
  checked: Set<number>
  onToggle: (p: MistakePreset) => void
  onChanged: () => Promise<void>
}): React.JSX.Element {
  const [presets, setPresets] = useState<MistakePreset[]>([])
  const [custom, setCustom] = useState('')
  useEffect(() => {
    window.api.mistakePresetsList().then(setPresets).catch(console.error)
  }, [])
  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {presets.map((p) => (
          <label
            key={p.id}
            className={`flex cursor-pointer select-none items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors ${
              checked.has(p.id)
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-500 hover:bg-zinc-100'
            }`}
          >
            <input
              type="checkbox"
              className="accent-white"
              checked={checked.has(p.id)}
              onChange={() => onToggle(p)}
            />
            {p.name}
            {p.isBuiltIn ? '' : ' · 自定义'}
          </label>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <input
          value={custom}
          placeholder="自定义错误原因,如:DP 状态定义错误"
          className="w-64 rounded-md border border-zinc-200 px-2 py-1 outline-none focus:border-zinc-400"
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && custom.trim()) {
              e.preventDefault()
              void (async () => {
                try {
                  const preset = await window.api.mistakePresetAdd(custom)
                  setCustom('')
                  await window.api.problemAddMistake(problemId, preset.id)
                  await onChanged()
                } catch (err) {
                  console.error(err)
                }
              })()
            }
          }}
        />
      </div>
    </div>
  )
}

/* ---------- 子组件:添加题解表单 ---------- */

function SolutionForm({
  problemId,
  initial,
  onClose,
  onSaved
}: {
  problemId: number
  /** 传入 = 编辑模式,预填原值并走 solutionUpdate */
  initial?: Solution
  onClose: () => void
  onSaved: () => Promise<void>
}): React.JSX.Element {
  const [languages, setLanguages] = useState<LanguagePreset[]>([])
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [languageId, setLanguageId] = useState<number | null>(initial?.languageId ?? null)
  const [code, setCode] = useState(initial?.code ?? '')
  const [newLang, setNewLang] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.api
      .languagePresetsList()
      .then((list) => {
        setLanguages(list)
        // 未指定(编辑原语言为空/新增)时默认第一项
        setLanguageId((prev) => prev ?? list[0]?.id ?? null)
      })
      .catch(console.error)
  }, [])

  async function save(): Promise<void> {
    if (saving) return
    setSaving(true)
    try {
      const draft: SolutionDraft = { title, description, languageId, code }
      if (initial) await window.api.solutionUpdate(initial.id, draft)
      else await window.api.solutionAdd(problemId, draft)
      onClose()
      await onSaved()
    } catch (err) {
      console.error(err)
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex gap-3">
        <input
          value={title}
          placeholder="题解标题,如:Monotonic Stack"
          className={`${inputCls} flex-1`}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select
          value={languageId ?? ''}
          onChange={(e) => setLanguageId(e.target.value ? Number(e.target.value) : null)}
          className="rounded-md border border-zinc-200 px-2 text-sm outline-none focus:border-zinc-400"
        >
          {languages.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <input
        value={newLang}
        placeholder="新语言(可选):输入后回车,如 C / Kotlin / Pseudo Code"
        className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-xs outline-none focus:border-zinc-400"
        onChange={(e) => setNewLang(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && newLang.trim()) {
            e.preventDefault()
            void (async () => {
              const l = await window.api.languagePresetAdd(newLang)
              setLanguages((prev) => [...prev, l])
              setLanguageId(l.id)
              setNewLang('')
            })().catch(console.error)
          }
        }}
      />
      <textarea
        value={description}
        rows={2}
        placeholder="思路 / 复杂度说明…"
        className={`${inputCls} resize-y text-xs`}
        onChange={(e) => setDescription(e.target.value)}
      />
      <textarea
        value={code}
        rows={8}
        placeholder="代码…"
        spellCheck={false}
        className={`${inputCls} resize-y font-mono text-[13px]`}
        onChange={(e) => setCode(e.target.value)}
      />
      <div className="flex gap-2">
        <button className={btnPrimary} disabled={saving} onClick={() => void save()}>
          {initial ? '保存修改' : '保存题解'}
        </button>
        <button className={btnGhost} onClick={onClose}>
          取消
        </button>
      </div>
    </div>
  )
}
