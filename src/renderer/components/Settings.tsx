import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useUi } from '../store/ui'
import type { AppSettings } from '../../shared/types'

export default function Settings(): JSX.Element | null {
  const open = useUi((state) => state.settingsOpen)
  const close = useUi((state) => state.setSettingsOpen)
  const theme = useUi((state) => state.theme)
  const setTheme = useUi((state) => state.setTheme)
  const [launchAtLogin, setLaunchAtLogin] = useState(false)

  useEffect(() => {
    if (open) void window.owtion.settings.get().then((settings: AppSettings) => setLaunchAtLogin(settings.launchAtLogin === true))
  }, [open])
  if (!open) return null

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(false) }}>
    <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header><h2 id="settings-title">Настройки</h2><button className="icon-button" onClick={() => close(false)} aria-label="Закрыть"><X size={18} /></button></header>
      <label className="setting-row">Тема
        <select value={theme} onChange={(event) => setTheme(event.target.value as 'light' | 'dark')}><option value="light">Светлая</option><option value="dark">Тёмная</option></select>
      </label>
      {window.owtion.platform !== 'linux' && <label className="setting-row">Запускать при входе в систему
        <input type="checkbox" checked={launchAtLogin} onChange={(event) => {
          const value = event.target.checked
          setLaunchAtLogin(value)
          void window.owtion.settings.set('launchAtLogin', value)
        }} />
      </label>}
      <p className="settings-note">Заметки хранятся локально на этом устройстве. Телеметрия отключена.</p>
    </section>
  </div>
}
