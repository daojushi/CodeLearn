import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { ContentBlock } from '../../../shared/types'
import BlockImage from './BlockImage'

/**
 * 全屏大字阅读层:题目正文按阅读字号铺开展示(详情页 / 复习弹层共用,
 * 便于长题阅读与复习时细读题面)。关闭:右上 ✕ 或 Esc。
 */
export default function ZoomedViewer({
  title,
  blocks,
  onClose
}: {
  title: string
  blocks: ContentBlock[]
  onClose: () => void
}): React.JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-white"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-4">
        <h2 className="min-w-0 break-words text-base font-semibold text-zinc-900">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          title="关闭(Esc)"
        >
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-4 pb-16">
          {blocks.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-400">这道题没有记录正文。</p>
          )}
          {blocks.map((b) =>
            b.type === 'image' && b.imageFilename ? (
              <BlockImage key={b.id} filename={b.imageFilename} natural />
            ) : (
              <p key={b.id} className="text-[15px] leading-7 whitespace-pre-wrap text-zinc-900">
                {b.text}
              </p>
            )
          )}
        </div>
      </div>
    </div>
  )
}
