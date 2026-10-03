import { useEffect } from 'react'
import { Minus, Square, X, PanelLeft, FilePlus2, Search } from 'lucide-react'
import { useUi } from '../../store/ui'
import { usePages } from '../../store/pages'
import { translate } from '../../lib/i18n'

export default function TitleBar(): JSX.Element {
  const toggleSidebar = useUi((state) => state.toggleSidebar)
  const create = usePages((state) => state.create)
  const language = useUi((state) => state.language)
  const sidebarOpen = useUi((state) => state.sidebarOpen)
  const paletteOpen = useUi((state) => state.paletteOpen)
  const query = useUi((state) => state.commandQuery)
  const setQuery = useUi((state) => state.setCommandQuery)
  const setPaletteOpen = useUi((state) => state.setPaletteOpen)
  useEffect(() => {
    if (paletteOpen) document.querySelector<HTMLInputElement>('.titlebar-search input')?.focus()
  }, [paletteOpen])
  return (
    <div className="titlebar">
      <div className="titlebar-left">
        <button className="icon-button no-drag" aria-label={translate(language, sidebarOpen ? 'hideSidebar' : 'showSidebar')} data-tooltip={translate(language, sidebarOpen ? 'hideSidebar' : 'showSidebar')} onClick={toggleSidebar}><PanelLeft size={17} /></button>
        <button className="icon-button no-drag" aria-label={translate(language, 'newPage')} data-tooltip={translate(language, 'newPage')} onClick={() => void create()}><FilePlus2 size={16} /></button>
        <span className="app-name">Owtion</span>
      </div>
      <label className={`titlebar-search no-drag ${paletteOpen ? 'is-active' : ''}`}>
        <Search size={15} />
        <input
          value={query}
          aria-label={translate(language, 'searchPages')}
          placeholder={translate(language, 'search')}
          onFocus={() => setPaletteOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value)
            setPaletteOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setQuery('')
              setPaletteOpen(false)
              event.currentTarget.blur()
            }
          }}
        />
        <kbd>{window.owtion.platform === 'darwin' ? '⌘ K' : 'Ctrl K'}</kbd>
      </label>
      {window.owtion.platform !== 'darwin' && <div className="window-controls no-drag">
        <button aria-label={translate(language, 'minimizeWindow')} onClick={() => window.owtion.window.minimize()}><Minus size={14} /></button>
        <button aria-label={translate(language, 'maximizeWindow')} onClick={() => window.owtion.window.toggleMaximize()}><Square size={12} /></button>
        <button aria-label={translate(language, 'closeWindow')} className="close-window" onClick={() => window.owtion.window.close()}><X size={15} /></button>
      </div>}
    </div>
  )
}
