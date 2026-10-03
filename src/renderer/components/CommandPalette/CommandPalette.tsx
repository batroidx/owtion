import { useEffect, useMemo, useState } from 'react'
import { Command } from 'cmdk'
import Fuse from 'fuse.js'
import { FilePlus2, Moon, Search, Settings, Trash2, FileDown, FileText } from 'lucide-react'
import { usePages } from '../../store/pages'
import { useUi } from '../../store/ui'
import { exportMarkdown } from '../../lib/markdown'
import { translate } from '../../lib/i18n'

export default function CommandPalette(): JSX.Element {
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
  const titleMatches = useMemo(() => new Fuse(pages, { keys: ['title'], threshold: 0.38 }).search(query).map((result) => result.item), [pages, query])
  const [contentPages, setContentPages] = useState<typeof pages>([])
  const matchingPages = useMemo(() => [...new Map([...contentPages, ...titleMatches].map((page) => [page.id, page])).values()], [contentPages, titleMatches])

  useEffect(() => {
    if (!open || !query.trim()) {
      setContentPages([])
      if (!open) setQuery('')
      return
    }
    let active = true
    void window.owtion.pages.search(query).then((results) => { if (active) setContentPages(results) })
    return () => { active = false }
  }, [open, query, setQuery])

  const download = (): void => {
    if (!current) return
    const anchor = document.createElement('a')
    anchor.href = URL.createObjectURL(new Blob([exportMarkdown(current.title, current.content)], { type: 'text/markdown;charset=utf-8' }))
    anchor.download = `${current.title || 'Заметка'}.md`
    anchor.click()
    URL.revokeObjectURL(anchor.href)
  }

  return <Command.Dialog open={open} onOpenChange={setOpen} label={translate(language, 'searchPages')} className="command-dialog">
    <div className="command-search"><Search size={17} /><Command.Input value={query} onValueChange={setQuery} placeholder={translate(language, 'search')} autoFocus /></div>
    <Command.List>
      <Command.Empty>{translate(language, 'noResults')}</Command.Empty>
      <Command.Group heading={translate(language, 'pages')}>
        {matchingPages.map((page) => <Command.Item key={page.id} value={`${page.title} ${query}`} onSelect={() => { void usePages.getState().select(page.id); setOpen(false) }}><FileText size={16} />{page.title}</Command.Item>)}
      </Command.Group>
      <Command.Group heading={translate(language, 'commands')}>
        <Command.Item onSelect={() => { void create(); setOpen(false) }}><FilePlus2 size={16} /> {translate(language, 'createPage')} <kbd>Ctrl N</kbd></Command.Item>
        <Command.Item onSelect={() => { if (current) void remove(current.id); setOpen(false) }}><Trash2 size={16} /> {translate(language, 'deleteCurrent')}</Command.Item>
        <Command.Item onSelect={() => { download(); setOpen(false) }}><FileDown size={16} /> {translate(language, 'exportMarkdown')}</Command.Item>
        <Command.Item onSelect={() => { toggleTheme(); setOpen(false) }}><Moon size={16} /> {translate(language, 'switchTheme')}</Command.Item>
        <Command.Item onSelect={() => { setSettingsOpen(true); setOpen(false) }}><Settings size={16} /> {translate(language, 'openSettings')}</Command.Item>
        <Command.Item onSelect={() => { setOpen(false); document.querySelector<HTMLInputElement>('.titlebar-search input')?.focus() }}><FileText size={16} /> {translate(language, 'searchAll')}</Command.Item>
      </Command.Group>
    </Command.List>
  </Command.Dialog>
}
