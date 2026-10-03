import { useEffect, useMemo, useRef, useState } from 'react'
import Fuse from 'fuse.js'
import { FileDown, FilePlus2, FileText, Moon, Settings, Trash2 } from 'lucide-react'
import { usePages } from '../../store/pages'
import { useUi } from '../../store/ui'
import { exportMarkdown } from '../../lib/markdown'
import { translate } from '../../lib/i18n'
import type { Page } from '../../../shared/types'

interface PaletteOption {
  key: string
  label: string
  detail?: string
  icon: JSX.Element
  kind: 'page' | 'command'
  page?: Page
  run?: () => void
}

export default function CommandPalette(): JSX.Element | null {
  const open = useUi((state) => state.paletteOpen)
  const setOpen = useUi((state) => state.setPaletteOpen)
  const pages = usePages((state) => state.pages)
  const current = usePages((state) => state.currentPage)
  const create = usePages((state) => state.create)
  const remove = usePages((state) => state.remove)
  const toggleTheme = useUi((state) => state.toggleTheme)
  const setSettingsOpen = useUi((state) => state.setSettingsOpen)
  const language = useUi((state) => state.language)
  const query = useUi((state) => state.commandQuery)
  const setQuery = useUi((state) => state.setCommandQuery)
  const [contentPages, setContentPages] = useState<Page[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !query.trim()) {
      setContentPages([])
      if (!open) setQuery('')
      return
    }
    let active = true
    void window.owtion.pages.search(query).then((results) => {
      if (active) setContentPages(results)
    })
    return () => { active = false }
  }, [open, query, setQuery])

  const commands = useMemo<PaletteOption[]>(() => {
    const labels = language === 'ru'
      ? { create: 'Создать страницу', remove: 'Удалить текущую страницу', export: 'Экспортировать в Markdown', theme: 'Сменить тему', settings: 'Открыть настройки', search: 'Поиск по всем заметкам' }
      : { create: 'Create page', remove: 'Delete current page', export: 'Export as Markdown', theme: 'Switch theme', settings: 'Open settings', search: 'Search all notes' }
    const saveMarkdown = (): void => {
      if (!current) return
      const url = URL.createObjectURL(new Blob([exportMarkdown(current.title, current.content, language)], { type: 'text/markdown;charset=utf-8' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${current.title || (language === 'ru' ? 'Заметка' : 'Note')}.md`
      anchor.click()
      URL.revokeObjectURL(url)
    }
    return [
      { key: 'create', label: labels.create, icon: <FilePlus2 size={16} />, kind: 'command', run: () => { void create() } },
      { key: 'remove', label: labels.remove, icon: <Trash2 size={16} />, kind: 'command', run: () => { if (current) void remove(current.id) } },
      { key: 'export', label: labels.export, icon: <FileDown size={16} />, kind: 'command', run: saveMarkdown },
      { key: 'theme', label: labels.theme, icon: <Moon size={16} />, kind: 'command', run: toggleTheme },
      { key: 'settings', label: labels.settings, icon: <Settings size={16} />, kind: 'command', run: () => setSettingsOpen(true) },
      { key: 'search', label: labels.search, icon: <FileText size={16} />, kind: 'command', run: () => setQuery('') }
    ]
  }, [create, current, language, remove, setQuery, setSettingsOpen, toggleTheme])

  const options = useMemo(() => {
    const normalizedQuery = query.trim()
    const titleResults = normalizedQuery
      ? new Fuse(pages, { keys: ['title'], threshold: 0.38 }).search(normalizedQuery).map((result) => result.item)
      : pages.slice(0, 6)
    const pageResults = [...new Map([...contentPages, ...titleResults].map((page) => [page.id, page])).values()]
    const commandResults = normalizedQuery
      ? new Fuse(commands, { keys: ['label'], threshold: 0.38 }).search(normalizedQuery).map((result) => result.item)
      : commands
    const resultPages: PaletteOption[] = pageResults.map((page) => ({
      key: `page:${page.id}`,
      label: page.title,
      icon: <FileText size={16} />,
      kind: 'page',
      page
    }))
    return [...resultPages, ...commandResults]
  }, [commands, contentPages, pages, query])

  useEffect(() => setSelectedIndex(0), [query, open])

  useEffect(() => {
    const activeItem = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    activeItem?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex, options.length])

  useEffect(() => {
    if (!open) return
    const handleKeyboard = (event: KeyboardEvent): void => {
      if (event.key === 'ArrowDown' && options.length) {
        event.preventDefault()
        setSelectedIndex((index) => (index + 1) % options.length)
      } else if (event.key === 'ArrowUp' && options.length) {
        event.preventDefault()
        setSelectedIndex((index) => (index - 1 + options.length) % options.length)
      } else if (event.key === 'Enter' && options[selectedIndex]) {
        event.preventDefault()
        const option = options[selectedIndex]
        if (option.page) void usePages.getState().select(option.page.id)
        else option.run?.()
        setOpen(false)
        document.querySelector<HTMLInputElement>('.titlebar-search input')?.blur()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        setQuery('')
        document.querySelector<HTMLInputElement>('.titlebar-search input')?.blur()
      }
    }
    const closeOnOutsideClick = (event: MouseEvent): void => {
      if (!(event.target instanceof HTMLElement)) return
      if (!event.target.closest('.titlebar-search, .command-results-panel')) setOpen(false)
    }
    window.addEventListener('keydown', handleKeyboard)
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => {
      window.removeEventListener('keydown', handleKeyboard)
      document.removeEventListener('mousedown', closeOnOutsideClick)
    }
  }, [open, options, selectedIndex, setOpen, setQuery])

  if (!open) return null
  const pageCount = options.filter((option) => option.kind === 'page').length
  const labels = language === 'ru' ? { pages: 'Страницы', commands: 'Команды', none: 'Ничего не найдено' } : { pages: 'Pages', commands: 'Commands', none: 'No results found' }
  return (
    <section className="command-results-panel" role="listbox" aria-label={translate(language, 'searchPages')} ref={listRef}>
      {options.length === 0 && <div className="command-empty">{labels.none}</div>}
      {pageCount > 0 && <div className="command-group-label">{labels.pages}</div>}
      {pageCount === 0 && options.length > 0 && <div className="command-group-label">{labels.commands}</div>}
      {options.map((option, index) => (
        <div key={option.key}>
          {index === pageCount && pageCount > 0 && <div className="command-group-label">{labels.commands}</div>}
          <button
            type="button"
            className="command-result"
            role="option"
            aria-selected={selectedIndex === index}
            onMouseEnter={() => setSelectedIndex(index)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (option.page) void usePages.getState().select(option.page.id)
              else option.run?.()
              setOpen(false)
            }}
          >
            {option.icon}<span>{option.label}</span>
            {option.detail && <small>{option.detail}</small>}
          </button>
        </div>
      ))}
    </section>
  )
}
