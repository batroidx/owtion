import { useState } from 'react'
import { MoreHorizontal, Star, Share2, PanelRight, FileDown, Copy, Trash2, History, FileCode2 } from 'lucide-react'
import { usePages } from '../../store/pages'
import { useUi } from '../../store/ui'
import { exportHtml, exportMarkdown } from '../../lib/markdown'
import type { JsonNode } from '../../../shared/types'

export default function Topbar(): JSX.Element | null {
  const page = usePages((state) => state.currentPage)
  const update = usePages((state) => state.update)
  const remove = usePages((state) => state.remove)
  const create = usePages((state) => state.create)
  const toggleOutline = useUi((state) => state.toggleOutline)
  const [menuOpen, setMenuOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<Array<{ id: number; content: JsonNode; createdAt: string }>>([])
  if (!page) return null
  const saveMarkdown = (): void => {
    const blob = new Blob([exportMarkdown(page.title, page.content)], { type: 'text/markdown;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${page.title || 'Заметка'}.md`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  const saveHtml = (): void => {
    const blob = new Blob([exportHtml(page.title, page.content)], { type: 'text/html;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${page.title || 'Заметка'}.html`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  return (
    <header className="topbar">
      <div className="breadcrumbs"><span>{page.icon}</span><span>{page.title || 'Без названия'}</span></div>
      <div className="topbar-actions">
        <button className={`icon-button ${page.isFavorite ? 'favorite-active' : ''}`} title="В избранное" aria-label="Добавить в избранное" onClick={() => void update(page.id, { isFavorite: !page.isFavorite })}><Star size={17} /></button>
        <button className="icon-button" title="Поделиться (скоро)" aria-label="Поделиться" onClick={() => window.alert('Совместная работа появится в будущих версиях.')}><Share2 size={16} /></button>
        <button className="icon-button" title="Оглавление" aria-label="Переключить оглавление" onClick={toggleOutline}><PanelRight size={16} /></button>
        <div className="menu-anchor">
          <button className="icon-button" title="Дополнительно" aria-label="Дополнительные действия" onClick={() => setMenuOpen(!menuOpen)}><MoreHorizontal size={19} /></button>
          {menuOpen && <div className="context-menu">
            <button onClick={() => { void create({ title: `${page.title} — копия`, icon: page.icon, content: page.content }); setMenuOpen(false) }}><Copy size={14} /> Дублировать страницу</button>
            <button onClick={() => { saveMarkdown(); setMenuOpen(false) }}><FileDown size={14} /> Экспорт в Markdown</button>
            <button onClick={() => { saveHtml(); setMenuOpen(false) }}><FileCode2 size={14} /> Экспорт в HTML</button>
            <button onClick={async () => { setHistory(await window.owtion.pages.history(page.id)); setHistoryOpen(true); setMenuOpen(false) }}><History size={14} /> История версий</button>
            <button className="danger-action" onClick={() => { void remove(page.id); setMenuOpen(false) }}><Trash2 size={14} /> Удалить страницу</button>
          </div>}
        </div>
      </div>
      {historyOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setHistoryOpen(false) }}>
        <section className="settings-modal history-modal" role="dialog" aria-modal="true" aria-labelledby="history-title">
          <header><h2 id="history-title">История версий</h2><button className="icon-button" onClick={() => setHistoryOpen(false)}>×</button></header>
          {history.length ? history.map((version) => <div className="history-row" key={version.id}>
            <span>{new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(version.createdAt))}</span>
            <button onClick={async () => { await update(page.id, { content: version.content }); setHistoryOpen(false) }}>Восстановить</button>
          </div>) : <p className="settings-note">Сохранённых версий пока нет. История появляется после первого изменения.</p>}
        </section>
      </div>}
    </header>
  )
}
