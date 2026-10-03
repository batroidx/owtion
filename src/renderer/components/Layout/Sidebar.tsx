import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  Archive, BookOpen, Briefcase, ChevronDown, Code2, FilePlus2, FileText, Folder,
  Heart, Lightbulb, MoreHorizontal, Music, Plus, Settings, Star, Trash2
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { usePages } from '../../store/pages'
import { useUi } from '../../store/ui'
import { translate } from '../../lib/i18n'
import type { Page, PageGroup } from '../../../shared/types'

const groupIcons: Record<string, LucideIcon> = {
  folder: Folder, book: BookOpen, work: Briefcase, code: Code2, idea: Lightbulb,
  heart: Heart, music: Music, archive: Archive, star: Star
}
const iconOptions = Object.keys(groupIcons)

interface SidebarProps {
  isOpen: boolean
}

interface TreeRowProps {
  page: Page
  pages: Page[]
  depth: number
  onDropPage: (pageId: string, parent: Page) => void
  onContextMenu: (page: Page, event: ReactMouseEvent<HTMLDivElement>) => void
}

interface GroupContextMenu {
  group: PageGroup | null
  x: number
  y: number
}

function TreeRow({ page, pages, depth, onDropPage, onContextMenu }: TreeRowProps): JSX.Element {
  const selected = usePages((state) => state.currentPage?.id === page.id)
  const select = usePages((state) => state.select)
  const [expanded, setExpanded] = useState(true)
  const children = pages.filter((item) => item.parentId === page.id)
  return (
    <>
      <div
        className={`page-row ${selected ? 'selected' : ''}`}
        style={{ '--depth': Math.min(depth, 8) } as CSSProperties}
        onContextMenu={(event) => onContextMenu(page, event)}
        draggable
        onDragStart={(event) => event.dataTransfer.setData('text/page-id', page.id)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          const id = event.dataTransfer.getData('text/page-id')
          if (id && id !== page.id) onDropPage(id, page)
        }}
      >
        {children.length > 0 && <button className="tree-toggle" onClick={() => setExpanded(!expanded)} aria-label="Toggle nested pages"><ChevronDown size={13} className={!expanded ? 'collapsed' : ''} /></button>}
        <button className="page-row-main" onClick={() => void select(page.id)}><span className="page-label">{page.title}</span></button>
      </div>
      {expanded && children.map((child) => (
        <TreeRow key={child.id} page={child} pages={pages} depth={depth + 1} onDropPage={onDropPage} onContextMenu={onContextMenu} />
      ))}
    </>
  )
}

function readCollapsedGroups(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem('owtion.collapsed-groups')
    return saved ? JSON.parse(saved) as Record<string, boolean> : {}
  } catch (error) {
    console.error('Could not read collapsed group preferences', error)
    return {}
  }
}

export default function Sidebar({ isOpen }: SidebarProps): JSX.Element {
  const pages = usePages((state) => state.pages)
  const groups = usePages((state) => state.groups)
  const create = usePages((state) => state.create)
  const update = usePages((state) => state.update)
  const createGroup = usePages((state) => state.createGroup)
  const updateGroup = usePages((state) => state.updateGroup)
  const deleteGroup = usePages((state) => state.deleteGroup)
  const settingsOpen = useUi((state) => state.setSettingsOpen)
  const language = useUi((state) => state.language)
  const commandQuery = useUi((state) => state.commandQuery)
  const [query, setQuery] = useState('')
  const [trashOpen, setTrashOpen] = useState(false)
  const [trashPages, setTrashPages] = useState<Page[]>([])
  const [searchPages, setSearchPages] = useState<Page[]>([])
  const [contextMenu, setContextMenu] = useState<{ page: Page; x: number; y: number } | null>(null)
  const [groupMenu, setGroupMenu] = useState<GroupContextMenu | null>(null)
  const [dropGroupId, setDropGroupId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(readCollapsedGroups)
  const [groupDialog, setGroupDialog] = useState<{ group?: PageGroup; name: string; icon: string } | null>(null)

  useEffect(() => {
    if (!contextMenu && !groupMenu) return
    const closeOnOutsideClick = (event: globalThis.MouseEvent): void => {
      if (event.target instanceof HTMLElement && !event.target.closest('.sidebar-context-menu, .group-context-menu')) {
        setContextMenu(null)
        setGroupMenu(null)
      }
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [contextMenu, groupMenu])

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

  useEffect(() => {
    setQuery(commandQuery)
  }, [commandQuery])

  const visiblePages = useMemo(() => query.trim() ? searchPages : pages, [pages, query, searchPages])
  const personalPages = visiblePages.filter((page) => page.groupId === null)
  const pagesForGroup = (groupId: string): Page[] => visiblePages.filter((page) => page.groupId === groupId)
  const roots = (items: Page[]): Page[] => items.filter((page) => !page.parentId || !items.some((item) => item.id === page.parentId))
  const favorites = visiblePages.filter((page) => page.isFavorite)
  const filteredGroups = query.trim() ? groups.filter((group) => pagesForGroup(group.id).length > 0) : groups

  const onDropPage = async (id: string, parent: Page): Promise<void> => {
    if (id !== parent.id) {
      await update(id, { parentId: parent.id, groupId: parent.groupId })
      await usePages.getState().load()
    }
  }
  const openPageContext = (page: Page, event: ReactMouseEvent<HTMLDivElement>): void => {
    event.preventDefault()
    setGroupMenu(null)
    setContextMenu({ page, x: Math.min(event.clientX, window.innerWidth - 225), y: Math.min(event.clientY, window.innerHeight - 145) })
  }
  const movePageToGroup = async (id: string, groupId: string | null): Promise<void> => {
    await update(id, { groupId, parentId: null })
    await usePages.getState().load()
  }
  const toggleGroup = (id: string): void => setCollapsed((state) => {
    const next = { ...state, [id]: !state[id] }
    localStorage.setItem('owtion.collapsed-groups', JSON.stringify(next))
    return next
  })
  const submitGroup = async (): Promise<void> => {
    if (!groupDialog?.name.trim()) return
    if (groupDialog.group) await updateGroup(groupDialog.group.id, groupDialog.name, groupDialog.icon)
    else await createGroup(groupDialog.name, groupDialog.icon)
    setGroupDialog(null)
  }
  const contextMenuStyle = (menu: GroupContextMenu): CSSProperties => ({ left: menu.x, top: menu.y })

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'is-open' : 'is-closed'}`} aria-hidden={!isOpen}>
        <button className="new-page-button" onClick={() => void create()}><FilePlus2 size={15} /> {translate(language, 'newPage')}</button>
        <div className="sidebar-content">
          {favorites.length > 0 && <section className="sidebar-section">
            <h2><Star size={13} /> {translate(language, 'favorites')}</h2>
            {favorites.map((page) => <TreeRow key={`fav-${page.id}`} page={page} pages={[]} depth={0} onDropPage={onDropPage} onContextMenu={openPageContext} />)}
          </section>}

          <section className="sidebar-section page-list">
            <div
              className={`group-heading personal-heading ${dropGroupId === 'personal' ? 'drop-target' : ''}`}
              onDragEnter={() => setDropGroupId('personal')}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropGroupId(null) }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => { event.preventDefault(); setDropGroupId(null); const id = event.dataTransfer.getData('text/page-id'); if (id) void movePageToGroup(id, null) }}
            >
              <FileText size={14} /><span>{translate(language, 'personal')}</span>
              <button className="icon-button group-add" data-tooltip={translate(language, 'newGroup')} onClick={() => setGroupDialog({ name: '', icon: 'folder' })}><Plus size={15} /></button>
            </div>
            {roots(personalPages).map((page) => <TreeRow key={page.id} page={page} pages={personalPages} depth={0} onDropPage={onDropPage} onContextMenu={openPageContext} />)}
          </section>

          {filteredGroups.map((group) => {
            const Icon = groupIcons[group.icon] ?? Folder
            const members = pagesForGroup(group.id)
            return <section className="sidebar-section page-list" key={group.id}>
              <div
                className={`group-heading ${dropGroupId === group.id ? 'drop-target' : ''}`}
                onDragEnter={() => setDropGroupId(group.id)}
                onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropGroupId(null) }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  setDropGroupId(null)
                  const id = event.dataTransfer.getData('text/page-id')
                  if (id) void movePageToGroup(id, group.id)
                }}
              >
                <button className="group-collapse" onClick={() => toggleGroup(group.id)} aria-label={group.name}>
                  <ChevronDown size={13} className={collapsed[group.id] ? 'collapsed' : ''} />
                  <Icon size={14} />
                  <span className="group-name">{group.name}</span>
                </button>
                <button className="icon-button group-more" data-tooltip={translate(language, 'more')} onClick={(event) => {
                  setContextMenu(null)
                  setGroupMenu({ group, x: Math.min(event.currentTarget.getBoundingClientRect().right, window.innerWidth - 225), y: Math.min(event.currentTarget.getBoundingClientRect().bottom, window.innerHeight - 150) })
                }}><MoreHorizontal size={15} /></button>
              </div>
              {!collapsed[group.id] && roots(members).map((page) => <TreeRow key={page.id} page={page} pages={members} depth={0} onDropPage={onDropPage} onContextMenu={openPageContext} />)}
            </section>
          })}

          <button className="add-group-button" onClick={() => setGroupDialog({ name: '', icon: 'folder' })}><Plus size={14} /> {translate(language, 'newGroup')}</button>

          <section className="sidebar-section">
            <button className="trash-heading" onClick={async () => {
              const open = !trashOpen
              setTrashOpen(open)
              if (open) setTrashPages(await window.owtion.pages.trash())
            }}><Trash2 size={13} /> {translate(language, 'trash')}</button>
            {trashOpen && (trashPages.length
              ? trashPages.map((page) => <div className="trash-row" key={page.id}><span>{page.title}</span><button onClick={async () => {
                await window.owtion.pages.restore(page.id)
                setTrashPages(await window.owtion.pages.trash())
                await usePages.getState().load()
              }}>{translate(language, 'restore')}</button></div>)
              : <p className="trash-empty">{translate(language, 'emptyTrash')}</p>)}
          </section>
        </div>
        <button className="settings-button" onClick={() => settingsOpen(true)}><Settings size={16} /> {translate(language, 'settings')}</button>
      </aside>

      {contextMenu && createPortal(<div className="context-menu sidebar-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onMouseDown={(event) => event.stopPropagation()}>
        <button onClick={() => { void create({ parentId: contextMenu.page.id, groupId: contextMenu.page.groupId }); setContextMenu(null) }}><FilePlus2 size={14} /> {translate(language, 'addNestedPage')}</button>
        <button onClick={() => {
          void movePageToGroup(contextMenu.page.id, null)
          setContextMenu(null)
        }}><Folder size={14} /> {translate(language, 'moveToPersonal')}</button>
        {groups.filter((group) => group.id !== contextMenu.page.groupId).map((group) => {
          const Icon = groupIcons[group.icon] ?? Folder
          return <button key={group.id} onClick={() => { void movePageToGroup(contextMenu.page.id, group.id); setContextMenu(null) }}><Icon size={14} /> {group.name}</button>
        })}
        <button onClick={() => { void update(contextMenu.page.id, { isFavorite: !contextMenu.page.isFavorite }); setContextMenu(null) }}><Star size={14} /> {contextMenu.page.isFavorite ? translate(language, 'removeFavorite') : translate(language, 'favorite')}</button>
        <button onClick={() => { void usePages.getState().remove(contextMenu.page.id); setContextMenu(null) }}><Trash2 size={14} /> {translate(language, 'delete')}</button>
      </div>, document.body)}

      {groupMenu && createPortal(<div className="context-menu group-context-menu" style={contextMenuStyle(groupMenu)} onMouseDown={(event) => event.stopPropagation()}>
        <button onClick={() => { setGroupDialog({ group: groupMenu.group ?? undefined, name: groupMenu.group?.name ?? '', icon: groupMenu.group?.icon ?? 'folder' }); setGroupMenu(null) }}><Folder size={14} /> {translate(language, 'renameGroup')}</button>
        <button onClick={() => {
          if (groupMenu.group && window.confirm(translate(language, 'deleteGroupConfirm'))) void deleteGroup(groupMenu.group.id)
          setGroupMenu(null)
        }}><Trash2 size={14} /> {translate(language, 'deleteGroup')}</button>
      </div>, document.body)}

      {groupDialog && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setGroupDialog(null) }}>
        <section className="settings-modal group-dialog" role="dialog" aria-modal="true" aria-labelledby="group-dialog-title">
          <header><h2 id="group-dialog-title">{groupDialog.group ? translate(language, 'renameGroup') : translate(language, 'createGroup')}</h2></header>
          <input autoFocus value={groupDialog.name} aria-label={translate(language, 'groupName')} placeholder={translate(language, 'groupName')} onChange={(event) => setGroupDialog({ ...groupDialog, name: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') void submitGroup() }} />
          <div className="group-icon-picker" aria-label={language === 'ru' ? 'Иконка группы' : 'Group icon'}>
            {iconOptions.map((icon) => {
              const Icon = groupIcons[icon]
              return <button key={icon} className={groupDialog.icon === icon ? 'selected' : ''} aria-label={icon} aria-pressed={groupDialog.icon === icon} onClick={() => setGroupDialog({ ...groupDialog, icon })}><Icon size={17} /></button>
            })}
          </div>
          <footer><button className="secondary-button" onClick={() => setGroupDialog(null)}>{language === 'ru' ? 'Отмена' : 'Cancel'}</button><button className="primary-button" disabled={!groupDialog.name.trim()} onClick={() => void submitGroup()}>{language === 'ru' ? 'Сохранить' : 'Save'}</button></footer>
        </section>
      </div>}
    </>
  )
}
