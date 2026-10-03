import { useMemo, useState } from 'react'
import { usePages } from '../../store/pages'
import { useUi } from '../../store/ui'
import { translate } from '../../lib/i18n'

export default function Outline(): JSX.Element | null {
  const editorState = usePages((state) => state.currentPage?.content)
  const open = useUi((state) => state.outlineOpen)
  const language = useUi((state) => state.language)
  const [target, setTarget] = useState<HTMLElement | null>(null)
  const headings = useMemo(() => {
    const output: Array<{ title: string; level: number }> = []
    const walk = (node: typeof editorState): void => {
      if (!node || typeof node !== 'object') return
      if (node.type === 'heading') output.push({ title: (node.content ?? []).map((part) => part.text ?? '').join(''), level: Number(node.attrs?.level ?? 1) })
      node.content?.forEach((child) => walk(child))
    }
    walk(editorState)
    return output
  }, [editorState])
  if (!open) return null
  return <aside className="outline"><h2>{translate(language, 'outline')}</h2>{headings.length ? headings.map((heading, index) => <button key={`${heading.title}-${index}`} style={{ paddingLeft: 8 + (heading.level - 1) * 12 }} onClick={() => {
    const nodes = Array.from(document.querySelectorAll('.tiptap h1, .tiptap h2, .tiptap h3'))
    const element = nodes[index] as HTMLElement | undefined
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTarget(element ?? null)
  }} className={target?.textContent === heading.title ? 'active' : ''}>{heading.title || translate(language, 'untitledHeading')}</button>) : <p>{translate(language, 'noOutline')}</p>}</aside>
}
