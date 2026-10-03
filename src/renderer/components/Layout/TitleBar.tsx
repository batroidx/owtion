import { Minus, Square, X, PanelLeft } from 'lucide-react'
import { Search } from 'lucide-react'
import { useUi } from '../../store/ui'
import { translate } from '../../lib/i18n'

export default function TitleBar(): JSX.Element {
  const toggleSidebar = useUi((state) => state.toggleSidebar)
  const language = useUi((state) => state.language)
  const sidebarOpen = useUi((state) => state.sidebarOpen)
  const query = useUi((state) => state.commandQuery)
  const setQuery = useUi((state) => state.setCommandQuery)
  const setPaletteOpen = useUi((state) => state.setPaletteOpen)
  return (
    <div className="titlebar">
      <div className="titlebar-left">
        <button className="icon-button no-drag" aria-label={translate(language, sidebarOpen ? 'hideSidebar' : 'showSidebar')} data-tooltip={translate(language, sidebarOpen ? 'hideSidebar' : 'showSidebar')} onClick={toggleSidebar}><PanelLeft size={17} /></button>
        <span className="app-name">Owtion</span>
      </div>
      <label className="titlebar-search no-drag">
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
        <kbd>Ctrl K</kbd>
      </label>
      {window.owtion.platform !== 'darwin' && <div className="window-controls no-drag">
        <button aria-label="Свернуть окно" onClick={() => window.owtion.window.minimize()}><Minus size={14} /></button>
        <button aria-label="Развернуть окно" onClick={() => window.owtion.window.toggleMaximize()}><Square size={12} /></button>
        <button aria-label="Закрыть окно" className="close-window" onClick={() => window.owtion.window.close()}><X size={15} /></button>
      </div>}
    </div>
  )
}
