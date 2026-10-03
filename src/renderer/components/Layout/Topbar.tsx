import { useCallback, useEffect, useRef, useState } from 'react'
import { MoreHorizontal, Star, Share2, PanelRight, FileDown, Copy, Trash2, History, FileCode2 } from 'lucide-react'
import { usePages } from '../../store/pages'
import { useUi } from '../../store/ui'
import { exportHtml, exportMarkdown } from '../../lib/markdown'
import type { JsonNode } from '../../../shared/types'
import { translate } from '../../lib/i18n'

export default function Topbar(): JSX.Element | null {
  const page = usePages((state) => state.currentPage)
  const update = usePages((state) => state.update)
  const remove = usePages((state) => state.remove)
  const create = usePages((state) => state.create)
  const toggleOutline = useUi((state) => state.toggleOutline)
  const language = useUi((state) => state.language)
  const [menuOpen, setMenuOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyClosing, setHistoryClosing] = useState(false)
  const historyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [history, setHistory] = useState<Array<{ id: number; content: JsonNode; createdAt: string }>>([])
  const closeHistory = useCallback((): void => {
    if (!historyOpen || historyClosing) return
    setHistoryClosing(true)
    historyTimer.current = setTimeout(() => {
      setHistoryOpen(false)
      setHistoryClosing(false)
      historyTimer.current = null
    }, 200)
  }, [historyClosing, historyOpen])
  useEffect(() => () => {
    if (historyTimer.current) clearTimeout(historyTimer.current)
  }, [])
  useEffect(() => {
    if (!historyOpen) return
    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') closeHistory()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [closeHistory, historyOpen])
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
      <div className="breadcrumbs"><span>{page.title || 'Без названия'}</span></div>
      <div className="topbar-actions">
        <button className={`icon-button ${page.isFavorite ? 'favorite-active' : ''}`} data-tooltip={page.isFavorite ? translate(language, 'removeFavorite') : translate(language, 'favorite')} aria-label={page.isFavorite ? translate(language, 'removeFavorite') : translate(language, 'favorite')} onClick={() => void update(page.id, { isFavorite: !page.isFavorite })}><Star size={17} /></button>
        <button className="icon-button" data-tooltip={translate(language, 'share')} aria-label={translate(language, 'share')} onClick={() => window.alert(language === 'ru' ? 'Совместная работа недоступна офлайн.' : 'Collaboration is unavailable offline.')}><Share2 size={16} /></button>
        <button className="icon-button" data-tooltip={translate(language, 'outline')} aria-label={translate(language, 'outline')} onClick={toggleOutline}><PanelRight size={16} /></button>
        <div className="menu-anchor">
          <button className="icon-button" data-tooltip={translate(language, 'more')} aria-label={translate(language, 'more')} onClick={() => setMenuOpen(!menuOpen)}><MoreHorizontal size={19} /></button>
          {menuOpen && <div className="context-menu">
            <button onClick={() => { void create({ title: `${page.title}${language === 'ru' ? ' — копия' : ' — copy'}`, content: page.content }); setMenuOpen(false) }}><Copy size={14} /> {translate(language, 'duplicate')}</button>
            <button onClick={() => { saveMarkdown(); setMenuOpen(false) }}><FileDown size={14} /> {translate(language, 'exportMarkdown')}</button>
            <button onClick={() => { saveHtml(); setMenuOpen(false) }}><FileCode2 size={14} /> {translate(language, 'exportHtml')}</button>
            <button onClick={async () => { setHistory(await window.owtion.pages.history(page.id)); setHistoryClosing(false); setHistoryOpen(true); setMenuOpen(false) }}><History size={14} /> {translate(language, 'history')}</button>
            <button className="danger-action" onClick={() => { void remove(page.id); setMenuOpen(false) }}><Trash2 size={14} /> {translate(language, 'delete')}</button>
          </div>}
        </div>
      </div>
      {historyOpen && <div className={`modal-backdrop ${historyClosing ? 'is-closing' : ''}`} onMouseDown={(event) => { if (event.target === event.currentTarget) closeHistory() }}>
        <section className="settings-modal history-modal" role="dialog" aria-modal="true" aria-labelledby="history-title">
          <header><h2 id="history-title">{translate(language, 'history')}</h2><button className="icon-button" onClick={closeHistory}>×</button></header>
          {history.length ? history.map((version) => <div className="history-row" key={version.id}>
            <span>{new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(version.createdAt))}</span>
            <button onClick={async () => { await update(page.id, { content: version.content }); closeHistory() }}>Восстановить</button>
          </div>) : <p className="settings-note">{translate(language, 'historyEmpty')}</p>}
        </section>
      </div>}
    </header>
  )
}
