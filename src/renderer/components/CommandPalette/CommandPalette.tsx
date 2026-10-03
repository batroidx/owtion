import { useEffect, useMemo, useState } from 'react'
import { Command } from 'cmdk'
import Fuse from 'fuse.js'
import { FilePlus2, Moon, Search, Settings, Trash2, FileDown, FileText } from 'lucide-react'
import { usePages } from '../../store/pages'
import { useUi } from '../../store/ui'
import { exportMarkdown } from '../../lib/markdown'

export default function CommandPalette(): JSX.Element {
  const open = useUi((state) => state.paletteOpen)
  const setOpen = useUi((state) => state.setPaletteOpen)
  const pages = usePages((state) => state.pages)
  const current = usePages((state) => state.currentPage)
  const create = usePages((state) => state.create)
  const remove = usePages((state) => state.remove)
  const toggleTheme = useUi((state) => state.toggleTheme)
  const setSettingsOpen = useUi((state) => state.setSettingsOpen)
  const [query, setQuery] = useState('')
  const matchingPages = useMemo(() => new Fuse(pages, { keys: ['title'], threshold: 0.38 }).search(query).map((result) => result.item), [pages, query])

  useEffect(() => { if (!open) setQuery('') }, [open])

  const download = (): void => {
    if (!current) return
    const anchor = document.createElement('a')
    anchor.href = URL.createObjectURL(new Blob([exportMarkdown(current.title, current.content)], { type: 'text/markdown;charset=utf-8' }))
    anchor.download = `${current.title || 'Заметка'}.md`
    anchor.click()
    URL.revokeObjectURL(anchor.href)
  }

  return <Command.Dialog open={open} onOpenChange={setOpen} label="Палитра команд" className="command-dialog">
    <div className="command-search"><Search size={17} /><Command.Input value={query} onValueChange={setQuery} placeholder="Поиск страниц и команд…" autoFocus /></div>
    <Command.List>
      <Command.Empty>Ничего не найдено</Command.Empty>
      <Command.Group heading="Страницы">
        {matchingPages.map((page) => <Command.Item key={page.id} value={`Страница ${page.title}`} onSelect={() => { void usePages.getState().select(page.id); setOpen(false) }}><span>{page.icon}</span>{page.title}</Command.Item>)}
      </Command.Group>
      <Command.Group heading="Команды">
        <Command.Item onSelect={() => { void create(); setOpen(false) }}><FilePlus2 size={16} /> Создать страницу <kbd>Ctrl N</kbd></Command.Item>
        <Command.Item onSelect={() => { if (current) void remove(current.id); setOpen(false) }}><Trash2 size={16} /> Удалить текущую страницу</Command.Item>
        <Command.Item onSelect={() => { download(); setOpen(false) }}><FileDown size={16} /> Экспортировать в Markdown</Command.Item>
        <Command.Item onSelect={() => { toggleTheme(); setOpen(false) }}><Moon size={16} /> Сменить тему</Command.Item>
        <Command.Item onSelect={() => { setSettingsOpen(true); setOpen(false) }}><Settings size={16} /> Открыть настройки</Command.Item>
        <Command.Item onSelect={() => { setOpen(false); document.querySelector<HTMLInputElement>('.sidebar-search input')?.focus() }}><FileText size={16} /> Поиск по всем заметкам</Command.Item>
      </Command.Group>
    </Command.List>
  </Command.Dialog>
}
