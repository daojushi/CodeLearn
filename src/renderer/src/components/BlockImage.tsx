import { useEffect, useState } from 'react'

/** 图片块:主进程按文件名读出 data URL 后展示(题目详情 / 复习弹层共用) */
export default function BlockImage({ filename }: { filename: string }): React.JSX.Element | null {
  const [src, setSrc] = useState<string | null>(null)
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
  if (!src) return <div className="h-24 w-full animate-pulse rounded-md bg-zinc-100" />
  return <img src={src} alt="题目截图" className="max-h-96 rounded-md border border-zinc-200" />
}
