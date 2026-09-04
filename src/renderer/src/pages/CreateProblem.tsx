import { useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import type { ContentBlockDraft, KnowledgePoint, ProblemStatus, Rank } from '../../../shared/types'
import { btnPrimary, inputCls } from '../components/ui'
import KnowledgeChipsEditor from '../components/KnowledgeChipsEditor'
import { RANK_ORDER } from '../lib/constants'

/** 本页草稿块(尚未落库) */
interface DraftBlock {
  key: number
  type: 'text' | 'image'
  text: string
  dataUrl?: string
}

let blockKey = 0

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function CreateProblem(): React.JSX.Element {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [rank, setRank] = useState<Rank>('B')
  const [status, setStatus] = useState<ProblemStatus>('need_review')
  const [blocks, setBlocks] = useState<DraftBlock[]>([])
  const [kps, setKps] = useState<KnowledgePoint[]>([])
  const [saving, setSaving] = useState(false)
  const zoneRef = useRef<HTMLDivElement>(null)

  function addBlock(type: 'text' | 'image', payload: string): void {
    setBlocks((prev) => [
      ...prev,
      type === 'text'
        ? { key: ++blockKey, type, text: payload }
        : { key: ++blockKey, type, text: '', dataUrl: payload }
    ])
  }

  /** 整块区域支持粘贴:图片 → 截图块;空白区文本 → 文本块 */
  function handlePaste(e: React.ClipboardEvent): void {
    const imageItem = Array.from(e.clipboardData.items).find((i) =>
      i.type.startsWith('image/')
    )
    if (imageItem) {
      e.preventDefault()
      const file = imageItem.getAsFile()
      if (file) {
        void readFileAsDataUrl(file).then((dataUrl) => addBlock('image', dataUrl))
      }
      return
    }
    if (e.target === zoneRef.current) {
      const text = e.clipboardData.getData('text/plain')
      if (text.trim()) {
        e.preventDefault()
        addBlock('text', text)
      }
    }
  }

  async function handleSave(): Promise<void> {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const draft: ContentBlockDraft[] = blocks.map((b) =>
        b.type === 'text'
          ? { type: 'text', text: b.text }
          : { type: 'image', dataUrl: b.dataUrl }
      )
      const problem = await window.api.problemCreate({
        title,
        rank,
        status,
        blocks: draft,
        knowledgePointIds: kps.map((k) => k.id)
      })
      navigate(`/problems/${problem.id}`)
    } catch (err) {
      console.error(err)
      window.alert(`保存失败:${err instanceof Error ? err.message : String(err)}`)
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">New Problem</h1>
          <p className="mt-0.5 text-sm text-zinc-500">记录值得保留的题目,十几秒即可完成</p>
        </div>
        <Link to="/problems" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← 取消
        </Link>
      </div>

      <div className="space-y-5" onPaste={handlePaste}>
        {/* 标题 */}
        <input
          autoFocus
          value={title}
          placeholder="标题,如:739. Daily Temperatures"
          className={`${inputCls} text-base font-medium`}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* 题目内容:文本 / 截图(spec §6) */}
        <div
          ref={zoneRef}
          className="rounded-lg border border-dashed border-zinc-300 bg-white p-3 focus-within:border-zinc-400"
        >
          <div className="space-y-2">
            {blocks.map((b) =>
              b.type === 'text' ? (
                <textarea
                  key={b.key}
                  rows={Math.min(10, Math.max(3, b.text.split('\n').length))}
                  value={b.text}
                  placeholder="题目内容(文本)…"
                  className="w-full resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 font-mono text-[13px] leading-relaxed text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-zinc-400"
                  onChange={(e) =>
                    setBlocks((prev) =>
                      prev.map((x) => (x.key === b.key ? { ...x, text: e.target.value } : x))
                    )
                  }
                />
              ) : (
                <div key={b.key} className="group relative inline-block max-w-full">
                  <img
                    src={b.dataUrl}
                    alt="screenshot"
                    className="max-h-72 rounded-md border border-zinc-200 object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setBlocks((prev) => prev.filter((x) => x.key !== b.key))}
                    className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-xs text-white group-hover:flex"
                    title="删除截图"
                  >
                    ×
                  </button>
                </div>
              )
            )}
            <div className="flex items-center justify-between px-1 pb-0.5 pt-0.5 text-xs text-zinc-400">
              <span>
                {blocks.length === 0
                  ? '将题目文字粘贴到这里,Ctrl+V 可粘贴截图'
                  : '继续粘贴文字或截图(Ctrl+V)'}
              </span>
            </div>
          </div>
        </div>

        {/* Rank + Status */}
        <div className="flex items-center gap-8">
          <div>
            <div className="mb-1.5 text-xs text-zinc-400">Rank</div>
            <div className="flex gap-1.5">
              {RANK_ORDER.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRank(r)}
                  className={`h-8 w-8 rounded-md text-sm font-bold transition-colors ${
                    rank === r
                      ? 'bg-zinc-900 text-white'
                      : 'border border-zinc-300 bg-white text-zinc-500 hover:border-zinc-500'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs text-zinc-400">Status</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProblemStatus)}
              className="cursor-pointer rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-zinc-500"
            >
              <option value="need_review">需复习</option>
              <option value="not_started">未开始</option>
              <option value="attempting">尝试中</option>
              <option value="solved">已解决</option>
              <option value="mastered">已掌握</option>
            </select>
          </div>
        </div>

        {/* Knowledge Points(spec §2.5 Knowledge by Connection) */}
        <div>
          <div className="mb-1.5 text-xs text-zinc-400">Knowledge</div>
          <KnowledgeChipsEditor
            selected={kps}
            onAdd={(kp) => setKps((prev) => (prev.some((k) => k.id === kp.id) ? prev : [...prev, kp]))}
            onRemove={(kp) => setKps((prev) => prev.filter((k) => k.id !== kp.id))}
          />
        </div>

        <div className="pt-1">
          <button
            className={btnPrimary}
            disabled={!title.trim() || saving}
            onClick={() => void handleSave()}
          >
            {saving ? '保存中…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
