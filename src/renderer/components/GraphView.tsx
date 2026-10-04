import { useMemo } from 'react'
import { Network, X } from 'lucide-react'
import { usePages } from '../store/pages'
import { useUi } from '../store/ui'
import { translate } from '../lib/i18n'

interface GraphNode {
  id: string
  title: string
  x: number
  y: number
}

interface GraphEdge {
  from: string
  to: string
}

export default function GraphView(): JSX.Element | null {
  const open = useUi((state) => state.graphOpen)
  const setOpen = useUi((state) => state.setGraphOpen)
  const pages = usePages((state) => state.pages)
  const groups = usePages((state) => state.groups)
  const currentPage = usePages((state) => state.currentPage)
  const language = useUi((state) => state.language)
  const select = usePages((state) => state.select)

  const graphPages = useMemo(() => pages.map((page) => page.id === currentPage?.id && currentPage ? currentPage : page), [currentPage, pages])
  const { nodes, edges } = useMemo(() => {
    const nodeList: GraphNode[] = graphPages.map((page, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(graphPages.length, 1) - Math.PI / 2
      const radius = graphPages.length < 2 ? 0 : Math.min(190, 90 + graphPages.length * 3)
      return { id: page.id, title: page.title, x: 400 + Math.cos(angle) * radius, y: 260 + Math.sin(angle) * radius }
    })
    const pageIds = new Set(graphPages.map((page) => page.id))
    const foundEdges: GraphEdge[] = []
    const collect = (pageId: string, node: typeof pages[number]['content']): void => {
      if (node.type === 'text') {
        for (const mark of node.marks ?? []) {
          if (mark.type === 'wikiLink' && mark.attrs?.pageId && pageIds.has(mark.attrs.pageId)) {
            foundEdges.push({ from: pageId, to: mark.attrs.pageId })
          } else if (mark.type === 'wikiLink' && mark.attrs?.pageTitle) {
            const defaultGroup = language === 'ru' ? 'Личное' : 'Personal'
            const target = graphPages.find((page) => page.title === mark.attrs?.pageTitle
              && (groups.find((group) => group.id === page.groupId)?.name ?? defaultGroup) === (mark.attrs?.groupName ?? ''))
            if (target) foundEdges.push({ from: pageId, to: target.id })
          }
        }
      }
      node.content?.forEach((child) => collect(pageId, child))
    }
    graphPages.forEach((page) => collect(page.id, page.content))
    return { nodes: nodeList, edges: foundEdges }
  }, [graphPages, groups, language])

  if (!open) return null
  const close = (): void => setOpen(false)
  const category = (pageId: string): string => {
    const page = graphPages.find((item) => item.id === pageId)
    return groups.find((group) => group.id === page?.groupId)?.name ?? translate(language, 'personal')
  }

  return (
    <div className="graph-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
      <section className="graph-dialog" role="dialog" aria-modal="true" aria-labelledby="graph-title">
        <header>
          <h2 id="graph-title"><Network size={17} />{translate(language, 'graph')}</h2>
          <button className="icon-button" aria-label={translate(language, 'close')} onClick={close}><X size={17} /></button>
        </header>
        {nodes.length === 0 ? <p className="graph-empty">{translate(language, 'noPages')}</p> : (
          <svg className="graph-canvas" viewBox="0 0 800 520" role="img" aria-label={translate(language, 'graph')}>
            {edges.map((edge, index) => {
              const source = nodes.find((node) => node.id === edge.from)
              const target = nodes.find((node) => node.id === edge.to)
              if (!source || !target) return null
              return <line key={`${edge.from}:${edge.to}:${index}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} />
            })}
            {nodes.map((node) => {
              const active = node.id === currentPage?.id
              return (
                <g key={node.id} className={`graph-node${active ? ' active' : ''}`} role="button" tabIndex={0} aria-label={`${category(node.id)}: ${node.title}`} onClick={() => { void select(node.id); close() }} onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void select(node.id); close() }
                }}>
                  <circle cx={node.x} cy={node.y} r={active ? 9 : 7} />
                  <text x={node.x} y={node.y + 25}>{node.title}</text>
                </g>
              )
            })}
          </svg>
        )}
      </section>
    </div>
  )
}
