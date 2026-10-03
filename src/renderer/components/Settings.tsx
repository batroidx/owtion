import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useUi } from '../store/ui'
import type { AppSettings } from '../../shared/types'

export default function Settings(): JSX.Element | null {
  const open = useUi((state) => state.settingsOpen)
  const close = useUi((state) => state.setSettingsOpen)
  const theme = useUi((state) => state.theme)
  const setTheme = useUi((state) => state.setTheme)
  const language = useUi((state) => state.language)
  const setLanguage = useUi((state) => state.setLanguage)
  const fontFamily = useUi((state) => state.fontFamily)
  const setFontFamily = useUi((state) => state.setFontFamily)
  const fontSize = useUi((state) => state.fontSize)
  const setFontSize = useUi((state) => state.setFontSize)
  const lineHeight = useUi((state) => state.lineHeight)
  const setLineHeight = useUi((state) => state.setLineHeight)
  const [launchAtLogin, setLaunchAtLogin] = useState(false)
  const [themeOptionsOpen, setThemeOptionsOpen] = useState(false)
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    if (open) {
      setMounted(true)
      setClosing(false)
    } else if (mounted) {
      setClosing(true)
      closeTimer.current = setTimeout(() => {
        setMounted(false)
        setClosing(false)
      }, 200)
    }
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [mounted, open])

  useEffect(() => {
    if (open) void window.owtion.settings.get().then((settings: AppSettings) => setLaunchAtLogin(settings.launchAtLogin === true))
  }, [open])
  if (!mounted) return null

  return <div className={`modal-backdrop ${closing ? 'is-closing' : ''}`} onMouseDown={(event) => { if (event.target === event.currentTarget) close(false) }}>
    <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header><h2 id="settings-title">{language === 'ru' ? 'Настройки' : 'Settings'}</h2><button className="icon-button" onClick={() => close(false)} aria-label={language === 'ru' ? 'Закрыть' : 'Close'}><X size={18} /></button></header>
      <div className="setting-row"><span>{language === 'ru' ? 'Язык' : 'Language'}</span>
        <select value={language} onChange={(event) => setLanguage(event.target.value as 'ru' | 'en')}>
          <option value="ru">Русский</option><option value="en">English</option>
        </select>
      </div>
      <div className="setting-row"><span>{language === 'ru' ? 'Тема' : 'Theme'}</span>
        <div className="setting-select-wrap">
          <button className="setting-select-button" aria-haspopup="listbox" aria-expanded={themeOptionsOpen} onClick={() => setThemeOptionsOpen(!themeOptionsOpen)}>{theme === 'light' ? (language === 'ru' ? 'Светлая' : 'Light') : (language === 'ru' ? 'Тёмная' : 'Dark')}</button>
          {themeOptionsOpen && <div className="context-menu settings-dropdown" role="listbox" aria-label="Тема">
            <button role="option" aria-selected={theme === 'light'} onClick={() => { setTheme('light'); setThemeOptionsOpen(false) }}>{language === 'ru' ? 'Светлая' : 'Light'}</button>
            <button role="option" aria-selected={theme === 'dark'} onClick={() => { setTheme('dark'); setThemeOptionsOpen(false) }}>{language === 'ru' ? 'Тёмная' : 'Dark'}</button>
          </div>}
        </div>
      </div>
      <div className="setting-row"><label htmlFor="font-family">{language === 'ru' ? 'Шрифт' : 'Font'}</label>
        <select id="font-family" value={fontFamily} onChange={(event) => setFontFamily(event.target.value as 'system' | 'serif' | 'mono')}>
          <option value="system">{language === 'ru' ? 'Системный' : 'System'}</option>
          <option value="serif">{language === 'ru' ? 'С засечками' : 'Serif'}</option>
          <option value="mono">{language === 'ru' ? 'Моноширинный' : 'Monospace'}</option>
        </select>
      </div>
      <label className="setting-row range-setting"><span>{language === 'ru' ? 'Размер текста' : 'Text size'} <output>{fontSize}px</output></span>
        <input type="range" min="12" max="24" step="1" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} />
      </label>
      <label className="setting-row range-setting"><span>{language === 'ru' ? 'Межстрочный интервал' : 'Line spacing'} <output>{lineHeight.toFixed(1)}</output></span>
        <input type="range" min="1.3" max="2" step="0.1" value={lineHeight} onChange={(event) => setLineHeight(Number(event.target.value))} />
      </label>
      {window.owtion.platform !== 'linux' && <label className="setting-row">{language === 'ru' ? 'Запускать при входе в систему' : 'Launch at login'}
        <input type="checkbox" checked={launchAtLogin} onChange={(event) => {
          const value = event.target.checked
          setLaunchAtLogin(value)
          void window.owtion.settings.set('launchAtLogin', value)
        }} />
      </label>}
    </section>
  </div>
}
