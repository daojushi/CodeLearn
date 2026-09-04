import { useEffect, useState } from 'react'

/**
 * 图片块:主进程按文件名读出 data URL 后展示(题目详情 / 复习弹层共用)。
 * 默认点击放大查看原图(natural = 全宽平铺,供全屏阅读层用,不再二次放大)。
 */
export default function BlockImage({
  filename,
  natural = false
}: {
  filename: string
  natural?: boolean
}): React.JSX.Element | null {
  const [src, setSrc] = useState<string | null>(null)
  const [zoom, setZoom] = useState(false)

  useEffect(() => {
    let alive = true
    window.api
      .imageGet(filename)
      .then((s) => {
        if (alive) setSrc(s)
      })
      .catch(console.error)
    return () => {
      alive = false
    }
  }, [filename])

  // Esc 关闭放大层
  useEffect(() => {
    if (!zoom) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setZoom(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoom])

  if (!src) return <div className="h-24 w-full animate-pulse rounded-md bg-zinc-100" />
  if (natural) {
    return <img src={src} alt="题目截图" className="w-full rounded-md border border-zinc-200" />
  }
  return (
    <>
      <img
        src={src}
        alt="题目截图"
        title="点击放大"
        onClick={() => setZoom(true)}
        className="max-h-96 max-w-full cursor-zoom-in rounded-md border border-zinc-200"
      />
      {zoom && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-8"
          onClick={() => setZoom(false)}
        >
          <img
            src={src}
            alt="题目截图(放大)"
            className="max-h-full max-w-full rounded object-contain"
          />
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs whitespace-nowrap text-white/70">
            点击任意处或按 Esc 关闭
          </p>
        </div>
      )}
    </>
  )
}
