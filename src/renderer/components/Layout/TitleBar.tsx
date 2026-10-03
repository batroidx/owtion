import { Minus, Square, X, PanelLeft } from 'lucide-react'
import { useUi } from '../../store/ui'

export default function TitleBar(): JSX.Element {
  const toggleSidebar = useUi((state) => state.toggleSidebar)
  return (
    <div className="titlebar">
      <div className="titlebar-left">
        <button className="icon-button no-drag" aria-label="Свернуть боковую панель" title="Боковая панель" onClick={toggleSidebar}><PanelLeft size={17} /></button>
        <span className="app-name">Owtion</span>
      </div>
      {window.owtion.platform !== 'darwin' && <div className="window-controls no-drag">
        <button aria-label="Свернуть окно" onClick={() => window.owtion.window.minimize()}><Minus size={14} /></button>
        <button aria-label="Развернуть окно" onClick={() => window.owtion.window.toggleMaximize()}><Square size={12} /></button>
        <button aria-label="Закрыть окно" className="close-window" onClick={() => window.owtion.window.close()}><X size={15} /></button>
      </div>}
    </div>
  )
}
