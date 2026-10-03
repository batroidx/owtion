import { useEffect, useMemo, useState } from 'react'
import { FilePlus2, Search, Settings, Star, Clock3, ChevronRight, FileText, Trash2 } from 'lucide-react'
import { usePages } from '../../store/pages'
import { useUi } from '../../store/ui'
import type { Page } from '../../../shared/types'

interface TreeRowProps {
  page: Page
  pages: Page[]
  depth: number
  onDropPage: (id: string, parentId: string | null) => void
}

function TreeRow({ page, pages, depth, onDropPage }: TreeRowProps): JSX.Element {
  const selected = usePages((state) => state.currentPage?.id === page.id)
  const select = usePages((state) => state.select)
  const [expanded, setExpanded] = useState(true)
  const children = pages.filter((item) => item.parentId === page.id)
  return (
    <>
      <div
        className={`page-row ${selected ? 'selected' : ''}`}
        style={{ paddingLeft: 8 + depth * 15 }}
        draggable
        onDragStart={(event) => event.dataTransfer.setData('text/page-id', page.id)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData('text/page-id'); if (id && id !== page.id) onDropPage(id, page.id) }}
      >
        {children.length > 0 && <button className="tree-toggle" onClick={() => setExpanded(!expanded)} aria-label="Раскрыть вложенные страницы"><ChevronRight size={13} className={expanded ? 'expanded' : ''} /></button>}
        <button className="page-row-main" onClick={() => void select(page.id)}><span>{page.icon || '📄'}</span><span className="page-label">{page.title || 'Без названия'}</span></button>
      </div>
      {expanded && children.map((child) => <TreeRow key={child.id} page={child} pages={pages} depth={depth + 1} onDropPage={onDropPage} />)}
    </>
  )
}

export default function Sidebar(): JSX.Element {
  const pages = usePages((state) => state.pages)
  const create = usePages((state) => state.create)
  const update = usePages((state) => state.update)
  const selectedId = usePages((state) => state.currentPage?.id)
  const settingsOpen = useUi((state) => state.setSettingsOpen)
  const [query, setQuery] = useState('')
  const [trashOpen, setTrashOpen] = useState(false)
  const [trashPages, setTrashPages] = useState<Page[]>([])
  const [searchPages, setSearchPages] = useState<Page[]>([])
  useEffect(() => {
    if (!query.trim()) {
      setSearchPages([])
      return
    }
    let active = true
    const timer = setTimeout(() => {
      void window.owtion.pages.search(query).then((results) => { if (active) setSearchPages(results) })
    }, 180)
    return () => { active = false; clearTimeout(timer) }
  }, [query])
  const visiblePages = useMemo(() => query.trim() ? searchPages : pages, [pages, query, searchPages])
  const roots = visiblePages.filter((page) => !page.parentId || !visiblePages.some((item) => item.id === page.parentId))
  const favorites = visiblePages.filter((page) => page.isFavorite)
  const recent = [...pages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5)
  const onDropPage = (id: string, parentId: string | null): void => {
    if (id !== parentId) void update(id, { parentId })
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск" aria-label="Поиск страниц" /></div>
      <button className="new-page-button" onClick={() => void create()}><FilePlus2 size={16} /> Новая страница</button>
      <div className="sidebar-content">
        {favorites.length > 0 && <section className="sidebar-section"><h2><Star size={13} /> Избранное</h2>{favorites.map((page) => <TreeRow key={`fav-${page.id}`} page={page} pages={[]} depth={0} onDropPage={onDropPage} />)}</section>}
        <section className="sidebar-section"><h2><Clock3 size={13} /> Недавние</h2>{recent.map((page) => <button key={`recent-${page.id}`} className={`page-row recent-row ${selectedId === page.id ? 'selected' : ''}`} onClick={() => void usePages.getState().select(page.id)}><span>{page.icon}</span><span className="page-label">{page.title}</span></button>)}</section>
        <section className="sidebar-section page-list"><h2><FileText size={13} /> Личное</h2>{roots.map((page) => <TreeRow key={page.id} page={page} pages={visiblePages} depth={0} onDropPage={onDropPage} />)}</section>
        <section className="sidebar-section">
          <button className="trash-heading" onClick={async () => {
            const open = !trashOpen
            setTrashOpen(open)
            if (open) setTrashPages(await window.owtion.pages.trash())
          }}><Trash2 size={13} /> Корзина</button>
          {trashOpen && (trashPages.length
            ? trashPages.map((page) => <div className="trash-row" key={page.id}><span>{page.icon} {page.title}</span><button onClick={async () => {
              await window.owtion.pages.restore(page.id)
              setTrashPages(await window.owtion.pages.trash())
              await usePages.getState().load()
            }}>Восстановить</button></div>)
            : <p className="trash-empty">Корзина пуста</p>)}
        </section>
      </div>
      <button className="settings-button" onClick={() => settingsOpen(true)}><Settings size={16} /> Настройки</button>
    </aside>
  )
}
