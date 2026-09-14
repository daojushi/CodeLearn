import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, Check, DatabaseBackup, FolderOpen, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { KnowledgePointWithCount, LanguagePreset, MistakePreset } from '../../../shared/types'
import {
  CURVE_MAX_STAGES,
  CURVE_MIN_STAGES,
  DEFAULT_REVIEW_CURVE,
  REVIEW_CURVE_PRESETS,
  validateReviewCurve
} from '../../../shared/review'
import { btnGhost, btnPrimary } from '../components/ui'

/* ---------- 通用行:改名 / 删除 ---------- */

interface RowItem {
  id: number
  name: string
}

function EditableRow({
  item,
  builtIn,
  meta,
  confirmText,
  onRename,
  onDelete
}: {
  item: RowItem
  builtIn?: boolean
  meta?: string
  confirmText: string
  onRename: (id: number, name: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
}): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.name)
  const [busy, setBusy] = useState(false)

  async function save(): Promise<void> {
    const name = draft.trim()
    if (!name || name === item.name) {
      setEditing(false)
      return
    }
    setBusy(true)
    try {
      await onRename(item.id, name)
      setEditing(false)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove(): Promise<void> {
    if (!window.confirm(confirmText)) return
    setBusy(true)
    try {
      await onDelete(item.id)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <div className="group flex items-center gap-2 px-1 py-1.5">
      {editing ? (
        <>
          <input
            autoFocus
            value={draft}
            className="h-7 w-52 rounded-md border border-zinc-300 px-2 text-sm outline-none focus:border-zinc-500"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save()
              if (e.key === 'Escape') setEditing(false)
            }}
          />
          <button className="text-zinc-500 hover:text-zinc-900" onClick={() => void save()} title="保存">
            <Check size={15} />
          </button>
          <button className="text-zinc-400 hover:text-zinc-700" onClick={() => setEditing(false)} title="取消">
            <X size={15} />
          </button>
        </>
      ) : (
        <>
          <span className="text-sm text-zinc-800">{item.name}</span>
          {builtIn && (
            <span className="rounded bg-zinc-100 px-1 py-0.5 text-[10px] text-zinc-400">内置</span>
          )}
          {meta && <span className="text-[11px] text-zinc-400">{meta}</span>}
          <span className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800"
              onClick={() => {
                setDraft(item.name)
                setEditing(true)
              }}
              title="重命名"
            >
              <Pencil size={14} />
            </button>
            <button
              className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500"
              onClick={() => void remove()}
              title="删除"
            >
              <Trash2 size={14} />
            </button>
          </span>
        </>
      )}
      {busy && <span className="ml-auto text-[11px] text-zinc-300">处理中…</span>}
    </div>
  )
}

/* ---------- 三个标签管理区 ---------- */

function KnowledgeManager(): React.JSX.Element {
  const [items, setItems] = useState<KnowledgePointWithCount[]>([])
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = useCallback(() => {
    window.api.knowledgeListAll().then(setItems).catch(console.error)
  }, [])
  useEffect(reload, [reload])

  async function add(): Promise<void> {
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      await window.api.knowledgeGetOrCreate(name)
      setName('')
      reload()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ManagerCard
      title="Knowledge Points"
      hint="标签可改名或删除;删除会解除所有题目的该标签,题目本身不受影响"
      inputValue={name}
      onInput={setName}
      onAdd={() => void add()}
    >
      {items.map((k) => (
        <EditableRow
          key={k.id}
          item={k}
          meta={`${k.problemCount} 题`}
          confirmText={`删除知识点「${k.name}」?\n${k.problemCount} 道题将失去该标签(题目不受影响)。`}
          onRename={async (id, n) => {
            await window.api.knowledgeRename(id, n)
            reload()
          }}
          onDelete={async (id) => {
            await window.api.knowledgeRemove(id)
            reload()
          }}
        />
      ))}
    </ManagerCard>
  )
}

function MistakeManager(): React.JSX.Element {
  const [items, setItems] = useState<MistakePreset[]>([])
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = useCallback(() => {
    window.api.mistakePresetsList().then(setItems).catch(console.error)
  }, [])
  useEffect(reload, [reload])

  async function add(): Promise<void> {
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      await window.api.mistakePresetAdd(name)
      setName('')
      reload()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ManagerCard
      title="Mistake Presets"
      hint="勾选错误原因时的可选项;删除后题目上的该原因随之清除"
      inputValue={name}
      onInput={setName}
      onAdd={() => void add()}
    >
      {items.map((m) => (
        <EditableRow
          key={m.id}
          item={m}
          builtIn={m.isBuiltIn}
          confirmText={`删除错误原因「${m.name}」?使用它的题目将不再勾选此项。`}
          onRename={async (id, n) => {
            await window.api.mistakePresetRename(id, n)
            reload()
          }}
          onDelete={async (id) => {
            await window.api.mistakePresetRemove(id)
            reload()
          }}
        />
      ))}
    </ManagerCard>
  )
}

function LanguageManager(): React.JSX.Element {
  const [items, setItems] = useState<LanguagePreset[]>([])
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = useCallback(() => {
    window.api.languagePresetsList().then(setItems).catch(console.error)
  }, [])
  useEffect(reload, [reload])

  async function add(): Promise<void> {
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      await window.api.languagePresetAdd(name)
      setName('')
      reload()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ManagerCard
      title="Language Presets"
      hint="写题解时可选的语言;删除后已有题解显示为「无语言」,高亮自动关闭"
      inputValue={name}
      onInput={setName}
      onAdd={() => void add()}
    >
      {items.map((l) => (
        <EditableRow
          key={l.id}
          item={l}
          builtIn={l.isBuiltIn}
          confirmText={`删除语言「${l.name}」?已有题解的语言标签将清空。`}
          onRename={async (id, n) => {
            await window.api.languagePresetRename(id, n)
            reload()
          }}
          onDelete={async (id) => {
            await window.api.languagePresetRemove(id)
            reload()
          }}
        />
      ))}
    </ManagerCard>
  )
}

/* ---------- 卡片外壳 + 底部新增输入 ---------- */

function ManagerCard({
  title,
  hint,
  inputValue,
  onInput,
  onAdd,
  children
}: {
  title: string
  hint: string
  inputValue: string
  onInput: (v: string) => void
  onAdd: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-800">{title}</h2>
      <p className="mt-0.5 text-xs text-zinc-400">{hint}</p>
      <div className="mt-3 divide-y divide-zinc-100">
        {children}
        <div className="flex items-center gap-2 pt-2">
          <input
            value={inputValue}
            placeholder="新增…(回车确认)"
            className="h-7 w-52 rounded-md border border-zinc-200 px-2 text-sm outline-none placeholder:text-zinc-300 focus:border-zinc-400"
            onChange={(e) => onInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onAdd()
            }}
          />
          <button
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
            onClick={onAdd}
            title="新增"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </section>
  )
}

/* ---------- 备份 ---------- */

function BackupCard(): React.JSX.Element {
  const [busy, setBusy] = useState(false)

  async function doExport(): Promise<void> {
    if (busy) return
    setBusy(true)
    try {
      const path = await window.api.backupExport()
      if (path) {
        window.alert(`备份已导出:\n${path}\n\n包含全部题目、复习记录与截图。请把文件放到安全的地方。`)
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function doImport(): Promise<void> {
    if (busy) return
    const chosen = await window.api.backupImportChoose()
    if (!chosen) return
    const ok = window.confirm(
      `从备份导入会【完全替换】当前数据。\n\n备份文件:\n${chosen}\n\n导入前应用会自动把现有数据保留到 pre-import-* 文件夹,确认新数据无误后可手动删除。\n\n确定继续吗?`
    )
    if (!ok) return
    setBusy(true)
    try {
      const r = await window.api.backupImportRun(chosen)
      window.alert(
        `导入完成:${r.problems} 道题、${r.images} 张图片。\n\n为保险起见,请重启应用确认数据完整。`
      )
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800">
        <DatabaseBackup size={14} className="text-zinc-400" /> 备份
      </h2>
      <p className="mt-0.5 text-xs text-zinc-400">
        导出为单个 JSON(含全部数据与截图);导入会替换当前数据,可在另一台电脑上恢复
      </p>
      <div className="mt-3 flex gap-2">
        <button className={btnPrimary} disabled={busy} onClick={() => void doExport()}>
          {busy ? '处理中…' : '导出备份…'}
        </button>
        <button
          className={`${btnGhost} border-rose-200 text-rose-600 hover:bg-rose-50`}
          disabled={busy}
          onClick={() => void doImport()}
        >
          导入备份…
        </button>
      </div>
    </section>
  )
}

/* ---------- 复习曲线 ---------- */

/**
 * 全局复习曲线:每档一个间隔天数,由 problems.review_stage 索引。
 * 保存会立即重排所有未掌握题目的下次复习时间(主进程一个事务里完成),
 * 所以这里要先确认再提交,并把重排的数量回报给用户。
 */
function ReviewCurveCard(): React.JSX.Element {
  const [draft, setDraft] = useState<string[]>([])
  const [saved, setSaved] = useState<number[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const reload = useCallback(() => {
    window.api
      .reviewCurveGet()
      .then((curve) => {
        setSaved(curve)
        setDraft(curve.map(String))
        setLoaded(true)
      })
      .catch(console.error)
  }, [])
  useEffect(reload, [reload])

  // 草稿用字符串:输入框中途可以为空,校验在保存前统一做
  const { curve, error } = validateReviewCurve(draft)
  const dirty =
    curve === null || curve.length !== saved.length || curve.some((d, i) => d !== saved[i])
  const canSave = loaded && !busy && curve !== null && dirty

  function editDraft(next: string[]): void {
    setDraft(next)
    setStatus('')
  }

  async function save(): Promise<void> {
    if (!canSave || !curve) return
    const ok = window.confirm(
      `把复习曲线改为 ${curve.join(' → ')} 天?\n\n` +
        `所有未掌握题目的下次复习时间会立即按新曲线重排 —— 缩短间隔可能让大量题目今天就到期。`
    )
    if (!ok) return
    setBusy(true)
    setStatus('')
    try {
      const { rescheduled } = await window.api.reviewCurveSet(curve)
      setSaved(curve)
      setDraft(curve.map(String))
      setStatus(`已保存 · 重排 ${rescheduled} 道题`)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800">
        <CalendarClock size={14} className="text-zinc-400" /> 复习曲线
      </h2>
      <p className="mt-0.5 text-xs text-zinc-400">
        每一档的复习间隔天数;保存后会立即按新曲线重排所有未掌握题目的下次复习时间
      </p>

      {/* 预设:只填充编辑器,不直接保存 */}
      {loaded && (
        <div className="mt-3 flex flex-wrap gap-2">
          {REVIEW_CURVE_PRESETS.map((p) => {
            const active = curve !== null && curve.join() === p.days.join()
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => editDraft(p.days.map(String))}
                className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                  active
                    ? 'border-zinc-800 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
                title={`套用「${p.name}」曲线`}
              >
                {p.name} · {p.days.join(' → ')}
              </button>
            )
          })}
        </div>
      )}

      {/* 逐档编辑 */}
      <div className="mt-4 space-y-1.5">
        {draft.map((value, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-xs text-zinc-500">第 {i + 1} 档</span>
            <input
              inputMode="numeric"
              value={value}
              className="h-7 w-20 rounded-md border border-zinc-300 px-2 text-sm outline-none focus:border-zinc-500"
              onChange={(e) => editDraft(draft.map((v, j) => (j === i ? e.target.value : v)))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void save()
              }}
            />
            <span className="text-xs text-zinc-500">天</span>
            <button
              type="button"
              className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
              disabled={draft.length <= CURVE_MIN_STAGES}
              onClick={() => editDraft(draft.filter((_, j) => j !== i))}
              title={draft.length <= CURVE_MIN_STAGES ? `至少保留 ${CURVE_MIN_STAGES} 档` : '删除该档'}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent"
          disabled={draft.length >= CURVE_MAX_STAGES}
          onClick={() => editDraft([...draft, ''])}
          title={draft.length >= CURVE_MAX_STAGES ? `最多 ${CURVE_MAX_STAGES} 档` : '在末尾增加一档'}
        >
          <Plus size={13} /> 增加一档
        </button>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          onClick={() => editDraft(DEFAULT_REVIEW_CURVE.map(String))}
        >
          恢复默认
        </button>
      </div>

      {/* 实时预览 / 校验错误 */}
      {curve ? (
        <>
          <p className="mt-3 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            <span className="font-medium text-zinc-700">{curve.join(' → ')} 天</span>
            <span className="text-zinc-400">
              {' '}
              · 忘了回到第 1 档,有点难重复当前档,会了进一档,轻松跳两档
            </span>
          </p>
          {curve.length === 1 && (
            <p className="mt-2 text-xs text-amber-600">
              只有 1 档时,四种反馈排出的下次复习时间相同。
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          className={btnPrimary}
          disabled={!canSave}
          onClick={() => void save()}
        >
          {busy ? '保存中…' : '保存并重排'}
        </button>
        {status && <span className="text-xs text-zinc-500">{status}</span>}
      </div>
    </section>
  )
}

/* ---------- 数据位置 ---------- */

function StorageCard(): React.JSX.Element {
  const [dir, setDir] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = useCallback(() => {
    window.api.dataDirGet().then(setDir).catch(console.error)
  }, [])
  useEffect(reload, [reload])

  async function change(): Promise<void> {
    if (busy) return
    const chosen = await window.api.dataDirChoose()
    if (!chosen) return
    const ok = window.confirm(
      `把数据目录从\n${dir}\n迁移到\n${chosen}?\n\n将把数据库与全部截图复制到新位置;原文件夹内容会保留,确认新位置正常后可手动删除。`
    )
    if (!ok) return
    setBusy(true)
    try {
      const next = await window.api.dataDirSet(chosen)
      setDir(next)
      window.alert(
        `数据已迁移到:\n${next}\n\n无需重启,应用已开始从新位置读写。\n(旧文件夹内容仍保留着,确认一切正常后可手动删除。)`
      )
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800">
        <FolderOpen size={14} className="text-zinc-400" /> 数据位置
      </h2>
      <p className="mt-0.5 text-xs text-zinc-400">
        数据库与题目截图存放在这里;默认在用户目录(%APPDATA%),可改到其它磁盘以免占用 C 盘
      </p>
      <p
        className="mt-3 rounded-md bg-zinc-50 px-3 py-2 font-mono text-xs break-all text-zinc-600"
        title={dir}
      >
        {dir || '加载中…'}
      </p>
      <div className="mt-3 flex gap-2">
        <button className={btnPrimary} disabled={busy} onClick={() => void change()}>
          {busy ? '迁移中…' : '更改位置…'}
        </button>
        <button
          className={btnGhost}
          disabled={busy}
          onClick={() => {
            window.api.dataDirOpen().catch((err) => {
              window.alert(err instanceof Error ? err.message : String(err))
            })
          }}
        >
          打开文件夹
        </button>
      </div>
    </section>
  )
}

export default function SettingsPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mb-6 mt-0.5 text-sm text-zinc-500">复习间隔 · 数据位置 · 备份 · 标签(Preset)管理</p>
      <div className="space-y-5">
        <StorageCard />
        <ReviewCurveCard />
        <BackupCard />
        <KnowledgeManager />
        <MistakeManager />
        <LanguageManager />
      </div>
    </div>
  )
}
