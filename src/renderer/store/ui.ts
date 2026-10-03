import { create } from 'zustand'

interface UiState {
  theme: 'light' | 'dark'
  language: 'ru' | 'en'
  fontFamily: 'system' | 'serif' | 'mono'
  fontSize: number
  lineHeight: number
  commandQuery: string
  sidebarOpen: boolean
  paletteOpen: boolean
  settingsOpen: boolean
  outlineOpen: boolean
  setTheme: (theme: 'light' | 'dark') => void
  toggleTheme: () => void
  toggleSidebar: () => void
  setPaletteOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  toggleOutline: () => void
  setLanguage: (language: 'ru' | 'en') => void
  setFontFamily: (font: 'system' | 'serif' | 'mono') => void
  setFontSize: (size: number) => void
  setLineHeight: (height: number) => void
  setCommandQuery: (query: string) => void
}

export const useUi = create<UiState>((set) => ({
  theme: 'light',
  language: 'ru',
  fontFamily: 'system',
  fontSize: 16,
  lineHeight: 1.6,
  commandQuery: '',
  sidebarOpen: true,
  paletteOpen: false,
  settingsOpen: false,
  outlineOpen: false,
  setTheme: (theme) => {
    document.documentElement.dataset.theme = theme
    void window.owtion.settings.set('theme', theme)
    set({ theme })
  },
  toggleTheme: () => set((state) => {
    const theme = state.theme === 'light' ? 'dark' : 'light'
    document.documentElement.dataset.theme = theme
    void window.owtion.settings.set('theme', theme)
    return { theme }
  }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  toggleOutline: () => set((state) => ({ outlineOpen: !state.outlineOpen })),
  setLanguage: (language) => {
    void window.owtion.settings.set('language', language)
    set({ language })
  },
  setFontFamily: (fontFamily) => {
    document.documentElement.dataset.font = fontFamily
    void window.owtion.settings.set('fontFamily', fontFamily)
    set({ fontFamily })
  },
  setFontSize: (fontSize) => {
    document.documentElement.style.setProperty('--editor-font-size', `${fontSize}px`)
    void window.owtion.settings.set('fontSize', fontSize)
    set({ fontSize })
  },
  setLineHeight: (lineHeight) => {
    document.documentElement.style.setProperty('--editor-line-height', String(lineHeight))
    void window.owtion.settings.set('lineHeight', lineHeight)
    set({ lineHeight })
  },
  setCommandQuery: (commandQuery) => set({ commandQuery })
}))
