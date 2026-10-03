import { useCallback, useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react'
import { PanelLeft, Search, FilePlus2, FileUp, Keyboard, FileText } from 'lucide-react'
import TitleBar from './components/Layout/TitleBar'
import Sidebar from './components/Layout/Sidebar'
import Topbar from './components/Layout/Topbar'
import Outline from './components/Layout/Outline'
import Editor from './components/Editor/Editor'
import CommandPalette from './components/CommandPalette/CommandPalette'
import Settings from './components/Settings'
import { usePages } from './store/pages'
import { useUi } from './store/ui'
import { importMarkdown } from './lib/markdown'
import { languageFromSettings, translate } from './lib/i18n'

export default function App(): JSX.Element {
  const pages = usePages((state) => state.pages)
  const page = usePages((state) => state.currentPage)
  const load = usePages((state) => state.load)
  const create = usePages((state) => state.create)
  const update = usePages((state) => state.update)
  const sidebarOpen = useUi((state) => state.sidebarOpen)
  const paletteOpen = useUi((state) => state.setPaletteOpen)
  const toggleSidebar = useUi((state) => state.toggleSidebar)
  const toggleTheme = useUi((state) => state.toggleTheme)
  const language = useUi((state) => state.language)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [shortcutsClosing, setShortcutsClosing] = useState(false)
  const shortcutsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const importInput = useRef<HTMLInputElement>(null)

  const closeShortcuts = useCallback((): void => {
    if (!showShortcuts || shortcutsClosing) return
    setShortcutsClosing(true)
    shortcutsTimer.current = setTimeout(() => {
      setShowShortcuts(false)
      setShortcutsClosing(false)
      shortcutsTimer.current = null
    }, 200)
  }, [showShortcuts, shortcutsClosing])

  useEffect(() => {
    document.documentElement.dataset.platform = window.owtion.platform
    void load()
    void usePages.getState().loadGroups()
    void window.owtion.settings.get().then((settings) => {
      const ui = useUi.getState()
      ui.setLanguage(languageFromSettings(settings))
      if (settings.theme === 'dark' || settings.theme === 'light') ui.setTheme(settings.theme)
      if (settings.fontFamily === 'system' || settings.fontFamily === 'serif' || settings.fontFamily === 'mono') ui.setFontFamily(settings.fontFamily)
      if (typeof settings.fontSize === 'number') ui.setFontSize(Math.max(12, Math.min(24, settings.fontSize)))
      if (typeof settings.lineHeight === 'number') ui.setLineHeight(Math.max(1.3, Math.min(2, settings.lineHeight)))
    })
    const removeNew = window.owtion.on('app:new-page', () => { void usePages.getState().create() })
    const removePalette = window.owtion.on('app:command-palette', () => paletteOpen(true))
    const removeExport = window.owtion.on('app:export', () => document.querySelector<HTMLButtonElement>('[aria-label="Дополнительные действия"]')?.click())
    return () => { removeNew(); removePalette(); removeExport() }
  }, [load, paletteOpen])

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      const mod = event.ctrlKey || event.metaKey
      if (mod && event.key.toLowerCase() === 'k') { event.preventDefault(); paletteOpen(true) }
      else if (mod && event.key.toLowerCase() === 'p') { event.preventDefault(); paletteOpen(true); document.querySelector<HTMLInputElement>('.command-search input')?.focus() }
      else if (mod && event.key.toLowerCase() === 'n') { event.preventDefault(); void create() }
      else if (mod && event.key === '\\') { event.preventDefault(); toggleSidebar() }
      else if (mod && event.shiftKey && event.key.toLowerCase() === 'd') { event.preventDefault(); toggleTheme() }
      else if (mod && event.key === '/') { event.preventDefault(); if (shortcutsTimer.current) clearTimeout(shortcutsTimer.current); setShortcutsClosing(false); setShowShortcuts(true) }
      else if (event.key === 'Escape') { closeShortcuts(); useUi.getState().setSettingsOpen(false); useUi.getState().setPaletteOpen(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeShortcuts, create, paletteOpen, toggleSidebar, toggleTheme])

  useEffect(() => () => {
    if (shortcutsTimer.current) clearTimeout(shortcutsTimer.current)
  }, [])

  const handleImport = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const markdownTitle = /^#\s+(.+)$/m.exec(text)?.[1] ?? file.name.replace(/\.md$/i, '')
    const content = importMarkdown(text.replace(/^#\s+.+\n?/, ''))
    const imported = await create({ title: markdownTitle, content })
    await update(imported.id, { content })
    event.target.value = ''
  }

  return <div className="app-shell">
    <TitleBar />
    <div className="app-body">
      <Sidebar isOpen={sidebarOpen} />
      <main className="main-panel">
        {page ? <>
          <Topbar />
          <div className="workspace">
            <section className="document-area">
              <div className="document-heading">
                <input className="page-title" value={page.title} onChange={(event) => {
                  const title = event.target.value
                  usePages.setState((state) => ({
                    currentPage: state.currentPage ? { ...state.currentPage, title } : null,
                    pages: state.pages.map((item) => item.id === page.id ? { ...item, title } : item)
                  }))
                }} onBlur={(event) => { void update(page.id, { title: event.currentTarget.value }) }} />
              </div>
              <Editor />
            </section>
            <Outline />
          </div>
        </> : <div className="empty-state">
          <FileText className="empty-icon" size={30} /><h1>{pages.length ? translate(language, 'choosePage') : translate(language, 'noPages')}</h1>
          <button className="primary-button" onClick={() => void create()}><FilePlus2 size={16} /> {translate(language, 'createPage')}</button>
        </div>}
        <div className="floating-tools">
          <button className="icon-button" data-tooltip={translate(language, 'searchPages')} onClick={() => paletteOpen(true)}><Search size={16} /></button>
          <button className="icon-button" data-tooltip={translate(language, 'importMarkdown')} onClick={() => importInput.current?.click()}><FileUp size={16} /></button>
          {!sidebarOpen && <button className="icon-button" data-tooltip={translate(language, 'showSidebar')} onClick={toggleSidebar}><PanelLeft size={16} /></button>}
          <button className="icon-button" data-tooltip={translate(language, 'shortcuts')} onClick={() => { if (shortcutsTimer.current) clearTimeout(shortcutsTimer.current); setShortcutsClosing(false); setShowShortcuts(true) }}><Keyboard size={16} /></button>
          <input ref={importInput} type="file" accept=".md,text/markdown" hidden onChange={(event) => { void handleImport(event) }} />
        </div>
      </main>
    </div>
    <CommandPalette />
    <Settings />
    {showShortcuts && <div className={`modal-backdrop ${shortcutsClosing ? 'is-closing' : ''}`} onMouseDown={(event: MouseEvent<HTMLDivElement>) => { if (event.target === event.currentTarget) closeShortcuts() }}>
      <section className="shortcuts-modal" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title"><header><h2 id="shortcuts-title">{translate(language, 'shortcuts')}</h2><button className="icon-button" onClick={closeShortcuts}>×</button></header>
        <div className="shortcut-row"><span>{language === 'ru' ? 'Палитра команд' : 'Command palette'}</span><kbd>Ctrl / ⌘ K</kbd></div>
        <div className="shortcut-row"><span>{translate(language, 'searchPages')}</span><kbd>Ctrl / ⌘ P</kbd></div>
        <div className="shortcut-row"><span>{translate(language, 'newPage')}</span><kbd>Ctrl / ⌘ N</kbd></div>
        <div className="shortcut-row"><span>{translate(language, 'hideSidebar')}</span><kbd>Ctrl / ⌘ \</kbd></div>
        <div className="shortcut-row"><span>{language === 'ru' ? 'Тёмная тема' : 'Dark theme'}</span><kbd>Ctrl / ⌘ ⇧ D</kbd></div>
        <div className="shortcut-row"><span>{language === 'ru' ? 'Полужирный / курсив / подчёркнутый' : 'Bold / italic / underline'}</span><kbd>Ctrl / ⌘ B / I / U</kbd></div>
      </section>
    </div>}
  </div>
}
