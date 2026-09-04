import hljs from 'highlight.js/lib/core'
import cpp from 'highlight.js/lib/languages/cpp'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import c from 'highlight.js/lib/languages/c'
import kotlin from 'highlight.js/lib/languages/kotlin'
import swift from 'highlight.js/lib/languages/swift'
import csharp from 'highlight.js/lib/languages/csharp'
import sql from 'highlight.js/lib/languages/sql'
import bash from 'highlight.js/lib/languages/bash'
import { useEffect, useRef } from 'react'

hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('python', python)
hljs.registerLanguage('java', java)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('c', c)
hljs.registerLanguage('kotlin', kotlin)
hljs.registerLanguage('swift', swift)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('bash', bash)

/** 常见语言 Preset 名 → hljs 语言 id */
const NAME_TO_HLJS: Record<string, string> = {
  'C++': 'cpp',
  'C': 'c',
  'C#': 'csharp',
  Python: 'python',
  Java: 'java',
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  Go: 'go',
  Rust: 'rust',
  Kotlin: 'kotlin',
  Swift: 'swift',
  SQL: 'sql',
  Bash: 'bash',
  Shell: 'bash',
  'Pseudo Code': '',
  Pseudocode: ''
}

function resolveHljsLanguage(languageName: string | null): string | null {
  if (!languageName) return null
  const trimmed = languageName.trim()
  const mapped = NAME_TO_HLJS[trimmed]
  if (mapped !== undefined) return mapped || null
  // 兜底:语言名本身与 hljs 别名一致(如 custom 名 'js' / 'ts')
  const alias = trimmed.toLowerCase()
  return hljs.getLanguage(alias) ? alias : null
}

/** 题解代码块:按所选语言做语法高亮;无匹配语言时以纯文本展示 */
export default function CodeBlock({
  code,
  language
}: {
  code: string
  language: string | null
}): React.JSX.Element {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const lang = resolveHljsLanguage(language)
    el.removeAttribute('data-highlighted')
    if (lang) {
      el.className = `hljs language-${lang}`
      hljs.highlightElement(el)
    } else {
      el.className = ''
      el.textContent = code
    }
  }, [code, language])

  return (
    <pre className="overflow-x-auto rounded-md border border-zinc-800 bg-zinc-900 p-3 text-[12.5px] leading-relaxed">
      <code ref={ref} className="hljs text-zinc-100">
        {code}
      </code>
    </pre>
  )
}
