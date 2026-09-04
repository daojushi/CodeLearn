import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, Play } from 'lucide-react'
import type { ProblemListItem } from '../../../shared/types'
import { btnPrimary, EmptyHint, RankBadge } from '../components/ui'
import ReviewModal from '../components/ReviewModal'
import { daysAgoText, REVIEW_LABELS } from '../lib/constants'

/** Today:到期复习队列(spec §25)。到期 = 已排期、时间到、状态未掌握 */
export default function Today(): React.JSX.Element {
  const [due, setDue] = useState<ProblemListItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [reviewingId, setReviewingId] = useState<number | null>(null)

  const reload = useCallback(async () => {
    setDue(await window.api.reviewDue())
    setLoaded(true)
  }, [])
  useEffect(() => {
    void reload().catch(console.error)
  }, [reload])

  const reviewing = due.find((p) => p.id === reviewingId) ?? null

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="text-2xl font-semibold">Today</h1>
      <p className="mt-0.5 text-sm text-zinc-500">Review Queue(复习队列)</p>

      <div className="mt-6">
        {!loaded ? null : due.length === 0 ? (
          <EmptyHint icon={<CalendarCheck size={36} />}>
            今天没有到期的复习 —— 队列已清空。
            <br />
            去 <Link to="/problems/new" className="text-zinc-700 underline">记一道新题</Link>,或享受清空队列的成就感。
          </EmptyHint>
        ) : (
          <>
            <p className="mb-2 text-xs text-zinc-400">{due.length} Problems Due</p>
            <div className="space-y-2">
              {due.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3"
                >
                  <RankBadge rank={p.rank} />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/problems/${p.id}`}
                      className="block truncate font-medium text-zinc-800 hover:text-zinc-950 hover:underline"
                      title={p.title}
                    >
                      {p.title}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-zinc-400">
                      {p.kpNames.map((n) => (
                        <span key={n} className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-500">
                          {n}
                        </span>
                      ))}
                      <span>
                        上次复习:
                        {p.lastReviewedAt
                          ? ` ${daysAgoText(p.lastReviewedAt)}${p.lastReviewResult ? ` · ${REVIEW_LABELS[p.lastReviewResult]}` : ''}`
                          : ' 还没复习过'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`${btnPrimary} flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs`}
                    onClick={() => setReviewingId(p.id)}
                  >
                    <Play size={12} /> 开始复习
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {reviewing && (
        <ReviewModal
          problemId={reviewing.id}
          onClose={() => setReviewingId(null)}
          onReviewed={() => {
            setReviewingId(null)
            void reload()
          }}
        />
      )}
    </div>
  )
}
