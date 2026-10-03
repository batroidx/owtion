import { create } from 'zustand'

interface UiState {
  theme: 'light' | 'dark'
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
}

export const useUi = create<UiState>((set) => ({
  theme: 'light',
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
  toggleOutline: () => set((state) => ({ outlineOpen: !state.outlineOpen }))
}))
