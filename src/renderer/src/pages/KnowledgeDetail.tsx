import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen } from 'lucide-react'
import type { KnowledgePointWithCount, ProblemListItem } from '../../../shared/types'
import { btnGhost, btnPrimary, EmptyHint, RankBadge, Section } from '../components/ui'
import MarkdownText from '../components/MarkdownText'
import { formatDate, RANK_ORDER, STATUS_LABELS } from '../lib/constants'

/**
 * Knowledge Point Detail(spec §10 双向链接的「知识点 → 题目」一侧):
 * 描述 / 分类 + 所有关联 Problem,点击任一行回到对应题目。
 */
export default function KnowledgeDetail(): React.JSX.Element {
  const { id } = useParams()
  const kpId = Number(id)

  const [kp, setKp] = useState<KnowledgePointWithCount | null>(null)
  const [problems, setProblems] = useState<ProblemListItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const reloadKp = useCallback(async () => {
    const k = await window.api.knowledgeGet(kpId)
    setKp(k)
    setLoading(false)
    return k
  }, [kpId])

  // 双向链接的另一侧:该知识点下的全部题目(按 S→C、再按更新时间排)
  const loadProblems = useCallback(
    async (name: string) => {
      const list = await window.api.problemsList()
      const filtered = list.filter((p) => p.kpNames.includes(name))
      filtered.sort(
        (a, b) => RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank) || b.updatedAt - a.updatedAt
      )
      setProblems(filtered)
    },
    []
  )

  useEffect(() => {
    void (async () => {
      try {
        const k = await reloadKp()
        if (k) {
          await loadProblems(k.name)
          // 现有分类,供编辑时联想
          const all = await window.api.knowledgeListAll()
          setCategories(
            [...new Set(all.map((x) => x.category?.trim()).filter((c): c is string => !!c))].sort((a, b) =>
              a.localeCompare(b, 'zh-CN')
            )
          )
        }
      } catch (err) {
        console.error(err)
        setLoading(false)
      }
    })()
  }, [reloadKp, loadProblems])

  /* ---------- 描述 / 分类编辑 ---------- */
  const [editing, setEditing] = useState(false)
  const [descDraft, setDescDraft] = useState('')
  const [catDraft, setCatDraft] = useState('')
  const [busy, setBusy] = useState(false)

  function startEdit(): void {
    if (!kp) return
    setDescDraft(kp.description)
    setCatDraft(kp.category ?? '')
    setEditing(true)
  }

  async function saveInfo(): Promise<void> {
    if (!kp || busy) return
    setBusy(true)
    try {
      await window.api.knowledgeUpdate(kp.id, {
        description: descDraft,
        // 空输入 = 清除分类
        category: catDraft.trim() ? catDraft : null
      })
      setEditing(false)
      const k = await reloadKp()
      if (k) await loadProblems(k.name)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="p-10 text-sm text-zinc-400">加载中…</div>
  if (!kp) {
    return (
      <div className="p-10 text-sm text-zinc-400">
        知识点不存在或已删除。<Link to="/knowledge" className="text-zinc-700 underline">返回 Knowledge</Link>
      </div>
    )
  }

  const linked = problems

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <div className="mb-1 text-xs text-zinc-400">
        <Link to="/knowledge" className="inline-flex items-center gap-1 hover:text-zinc-700">
          <ArrowLeft size={13} /> Knowledge
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold">{kp.name}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {kp.problemCount} 道题 · 创建于 {formatDate(kp.createdAt)}
          </p>
        </div>
        {!editing && (
          <button className={`${btnGhost} shrink-0 text-xs`} onClick={startEdit}>
            编辑信息
          </button>
        )}
      </div>

      {/* 描述 + 分类(spec §9) */}
      {editing ? (
        <div className="mt-5 space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">描述</label>
            <textarea
              rows={3}
              value={descDraft}
              placeholder="这个知识点讲的是什么?常见题型 / 解题套路 / 易错点…"
              className="w-full resize-y rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              onChange={(e) => setDescDraft(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">分类(Knowledge 页分组用)</label>
            <input
              value={catDraft}
              list="kp-categories"
              placeholder="如 Algorithms / Data Structures;留空 = 未分类"
              className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              onChange={(e) => setCatDraft(e.target.value)}
            />
            <datalist id="kp-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="flex gap-2">
            <button className={btnPrimary} disabled={busy} onClick={() => void saveInfo()}>
              保存
            </button>
            <button className={btnGhost} onClick={() => setEditing(false)}>
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {kp.description ? (
            <MarkdownText
              source={kp.description}
              className="rounded-lg border border-zinc-200 bg-white p-4 text-zinc-800"
            />
          ) : (
            <p className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-300">
              还没有描述 —— 点击「编辑信息」补充。
            </p>
          )}
          <p className="px-1 text-xs text-zinc-400">
            分类:
            <span className="ml-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-500">
              {kp.category || '未分类'}
            </span>
          </p>
        </div>
      )}

      {/* 关联题目(spec §10:KnowledgePoint → Problems 反向) */}
      <Section title={`Problems · ${linked.length} 道`}>
        {linked.length === 0 ? (
          <EmptyHint icon={<BookOpen size={36} />}>
            还没有题目关联到「{kp.name}」。在题目的 Knowledge 栏点击即可添加。
          </EmptyHint>
        ) : (
          <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
            {linked.map((p) => (
              <Link
                key={p.id}
                to={`/problems/${p.id}`}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-zinc-50"
              >
                <RankBadge rank={p.rank} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800">
                  {p.title}
                </span>
                <span className="shrink-0 text-xs text-zinc-400">{STATUS_LABELS[p.status]}</span>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
