import { useEffect, useMemo, useRef, useState } from 'react'
import type { KnowledgePoint } from '../../../shared/types'
import { Chip } from './ui'

/**
 * 知识点 chips 编辑器:展示已选 → 输入框联想(下拉)→ Enter/点击新建或选择。
 * 创建页与详情页共用。
 */
export default function KnowledgeChipsEditor({
  selected,
  onAdd,
  onRemove,
  onOpen
}: {
  selected: KnowledgePoint[]
  onAdd: (kp: KnowledgePoint) => void
  onRemove: (kp: KnowledgePoint) => void
  /** 提供时,chip 名称可点击跳转知识点详情 */
  onOpen?: (kp: KnowledgePoint) => void
}): React.JSX.Element {
  const [options, setOptions] = useState<KnowledgePoint[]>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.api.knowledgeListAll().then(setOptions).catch(console.error)
  }, [])

  const selectedIds = useMemo(() => new Set(selected.map((k) => k.id)), [selected])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options.filter((k) => !selectedIds.has(k.id)).slice(0, 8)
    return options
      .filter((k) => !selectedIds.has(k.id) && k.name.toLowerCase().includes(q))
      .slice(0, 8)
  }, [options, query, selectedIds])

  async function addByName(name: string): Promise<void> {
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    try {
      const kp = await window.api.knowledgeGetOrCreate(trimmed)
      setOptions((prev) => (prev.some((k) => k.id === kp.id) ? prev : [kp, ...prev]))
      if (!selectedIds.has(kp.id)) onAdd(kp)
      setQuery('')
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map((kp) => (
        <Chip
          key={kp.id}
          label={kp.name}
          onOpen={onOpen ? () => onOpen(kp) : undefined}
          onRemove={() => onRemove(kp)}
        />
      ))}
      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          disabled={busy}
          placeholder="+ 知识点"
          className="w-32 rounded-md border border-zinc-200 px-2 py-0.5 text-xs text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-zinc-400"
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) {
              e.preventDefault()
              void addByName(query)
            }
          }}
        />
        {open && (
          <div className="absolute left-0 top-full z-20 mt-1 max-h-56 w-56 overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg">
            {matches.map((kp) => (
              <button
                key={kp.id}
                type="button"
                className="block w-full px-3 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-50"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onAdd(kp)
                  setQuery('')
                }}
              >
                {kp.name}
              </button>
            ))}
            {query.trim() && !matches.some((k) => k.name === query.trim()) && (
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                onMouseDown={(e) => {
                  e.preventDefault()
                  void addByName(query)
                }}
              >
                + 新建「{query.trim()}」
              </button>
            )}
            {!query.trim() && matches.length === 0 && (
              <div className="px-3 py-1.5 text-xs text-zinc-400">暂无知识点,输入后回车新建</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
