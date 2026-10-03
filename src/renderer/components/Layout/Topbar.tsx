import { useState } from 'react'
import { MoreHorizontal, Star, Share2, PanelRight, FileDown, Copy, Trash2, FileCode2 } from 'lucide-react'
import { usePages } from '../../store/pages'
import { useUi } from '../../store/ui'
import { exportHtml, exportMarkdown } from '../../lib/markdown'
import { translate } from '../../lib/i18n'

export default function Topbar(): JSX.Element | null {
  const page = usePages((state) => state.currentPage)
  const update = usePages((state) => state.update)
  const remove = usePages((state) => state.remove)
  const create = usePages((state) => state.create)
  const toggleOutline = useUi((state) => state.toggleOutline)
  const language = useUi((state) => state.language)
  const [menuOpen, setMenuOpen] = useState(false)
  if (!page) return null
  const saveMarkdown = (): void => {
    const blob = new Blob([exportMarkdown(page.title, page.content, language)], { type: 'text/markdown;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${page.title || translate(language, 'untitledPage')}.md`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  const saveHtml = (): void => {
    const blob = new Blob([exportHtml(page.title, page.content, language)], { type: 'text/html;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${page.title || translate(language, 'untitledPage')}.html`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  return (
    <header className="topbar">
      <div className="breadcrumbs"><span>{page.title || translate(language, 'untitledPage')}</span></div>
      <div className="topbar-actions">
        <button className={`icon-button ${page.isFavorite ? 'favorite-active' : ''}`} data-tooltip={page.isFavorite ? translate(language, 'removeFavorite') : translate(language, 'favorite')} aria-label={page.isFavorite ? translate(language, 'removeFavorite') : translate(language, 'favorite')} onClick={() => void update(page.id, { isFavorite: !page.isFavorite })}><Star size={17} /></button>
        <button className="icon-button" data-tooltip={translate(language, 'share')} aria-label={translate(language, 'share')} onClick={() => window.alert(translate(language, 'shareOffline'))}><Share2 size={16} /></button>
        <button className="icon-button" data-tooltip={translate(language, 'outline')} aria-label={translate(language, 'outline')} onClick={toggleOutline}><PanelRight size={16} /></button>
        <div className="menu-anchor">
          <button id="more-actions-button" className="icon-button" data-tooltip={translate(language, 'more')} aria-label={translate(language, 'more')} onClick={() => setMenuOpen(!menuOpen)}><MoreHorizontal size={19} /></button>
          {menuOpen && <div className="context-menu">
            <button onClick={() => { void create({ title: `${page.title}${language === 'ru' ? ' — копия' : ' — copy'}`, content: page.content }); setMenuOpen(false) }}><Copy size={14} /> {translate(language, 'duplicate')}</button>
            <button onClick={() => { saveMarkdown(); setMenuOpen(false) }}><FileDown size={14} /> {translate(language, 'exportMarkdown')}</button>
            <button onClick={() => { saveHtml(); setMenuOpen(false) }}><FileCode2 size={14} /> {translate(language, 'exportHtml')}</button>
            <button className="danger-action" onClick={() => { void remove(page.id); setMenuOpen(false) }}><Trash2 size={14} /> {translate(language, 'delete')}</button>
          </div>}
        </div>
      </div>
    </header>
  )
}
