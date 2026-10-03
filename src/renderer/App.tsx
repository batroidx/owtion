import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react'
import { PanelLeft, Search, FilePlus2, FileUp, Keyboard, Star } from 'lucide-react'
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
  const [showShortcuts, setShowShortcuts] = useState(false)
  const importInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void load()
    void window.owtion.settings.get().then((settings) => {
      if (settings.theme === 'dark' || settings.theme === 'light') useUi.getState().setTheme(settings.theme)
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
      else if (mod && event.key === '/') { event.preventDefault(); setShowShortcuts(true) }
      else if (event.key === 'Escape') { setShowShortcuts(false); useUi.getState().setSettingsOpen(false); useUi.getState().setPaletteOpen(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [create, paletteOpen, toggleSidebar, toggleTheme])

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
      {sidebarOpen && <Sidebar />}
      <main className="main-panel">
        {page ? <>
          <Topbar />
          <div className="workspace">
            <section className="document-area">
              <div className="document-heading">
                <div className="page-icon" title="Иконка страницы">{page.icon}</div>
                <input className="page-title" value={page.title} placeholder="Без названия" onChange={(event) => {
                  const title = event.target.value
                  usePages.setState((state) => ({
                    currentPage: state.currentPage ? { ...state.currentPage, title } : null,
                    pages: state.pages.map((item) => item.id === page.id ? { ...item, title } : item)
                  }))
                }} onBlur={(event) => { void update(page.id, { title: event.currentTarget.value }) }} />
              </div>
              <div className="document-meta">Изменено {new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(page.updatedAt))}</div>
              <Editor />
              <div className="document-footer">
                <button onClick={() => void update(page.id, { isFavorite: !page.isFavorite })}><Star size={14} /> {page.isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}</button>
                <span>Все изменения сохраняются автоматически</span>
              </div>
            </section>
            <Outline />
          </div>
        </> : <div className="empty-state">
          <div className="empty-icon">📝</div><h1>{pages.length ? 'Выберите страницу' : 'Ваша база знаний начинается здесь'}</h1>
          <p>Создавайте заметки, структурируйте мысли и связывайте идеи.</p>
          <button className="primary-button" onClick={() => void create()}><FilePlus2 size={16} /> Создать страницу</button>
        </div>}
        <div className="floating-tools">
          <button className="icon-button" title="Поиск страниц (Ctrl+P)" onClick={() => paletteOpen(true)}><Search size={16} /></button>
          <button className="icon-button" title="Импорт Markdown" onClick={() => importInput.current?.click()}><FileUp size={16} /></button>
          {!sidebarOpen && <button className="icon-button" title="Показать боковую панель" onClick={toggleSidebar}><PanelLeft size={16} /></button>}
          <button className="icon-button" title="Горячие клавиши" onClick={() => setShowShortcuts(true)}><Keyboard size={16} /></button>
          <input ref={importInput} type="file" accept=".md,text/markdown" hidden onChange={(event) => { void handleImport(event) }} />
        </div>
      </main>
    </div>
    <CommandPalette />
    <Settings />
    {showShortcuts && <div className="modal-backdrop" onMouseDown={(event: MouseEvent<HTMLDivElement>) => { if (event.target === event.currentTarget) setShowShortcuts(false) }}>
      <section className="shortcuts-modal" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title"><header><h2 id="shortcuts-title">Горячие клавиши</h2><button className="icon-button" onClick={() => setShowShortcuts(false)}>×</button></header>
        <div className="shortcut-row"><span>Палитра команд</span><kbd>Ctrl / ⌘ K</kbd></div>
        <div className="shortcut-row"><span>Поиск страниц</span><kbd>Ctrl / ⌘ P</kbd></div>
        <div className="shortcut-row"><span>Новая страница</span><kbd>Ctrl / ⌘ N</kbd></div>
        <div className="shortcut-row"><span>Свернуть боковую панель</span><kbd>Ctrl / ⌘ \</kbd></div>
        <div className="shortcut-row"><span>Тёмная тема</span><kbd>Ctrl / ⌘ ⇧ D</kbd></div>
        <div className="shortcut-row"><span>Полужирный / курсив / подчёркнутый</span><kbd>Ctrl / ⌘ B / I / U</kbd></div>
      </section>
    </div>}
  </div>
}
