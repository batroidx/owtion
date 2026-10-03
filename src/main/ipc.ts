import { app, ipcMain, type BrowserWindow } from 'electron'
import type Store from 'electron-store'
import { database } from './db'
import type { AppSettings, PageInput } from '../shared/types'

export function registerIpc(getWindow: () => BrowserWindow | null, preferences: Store<{ launchAtLogin: boolean }>): void {
  ipcMain.handle('pages:list', () => database.listPages())
  ipcMain.handle('pages:trash', () => database.listTrash())
  ipcMain.handle('pages:get', (_event, id: string) => database.getPage(id))
  ipcMain.handle('pages:create', (_event, input: PageInput) => database.createPage(input))
  ipcMain.handle('pages:update', (_event, id: string, updates) => database.updatePage(id, updates))
  ipcMain.handle('pages:delete', (_event, id: string) => database.deletePage(id))
  ipcMain.handle('pages:restore', (_event, id: string) => database.restorePage(id))
  ipcMain.handle('pages:search', (_event, query: string) => database.search(query))
  ipcMain.handle('pages:history', (_event, id: string) => database.getHistory(id))
  ipcMain.handle('settings:get', () => ({ ...database.getSettings(), launchAtLogin: preferences.get('launchAtLogin') }))
  ipcMain.handle('settings:set', (_event, key: string, value: unknown) => {
    if (key === 'launchAtLogin' && typeof value === 'boolean') {
      preferences.set('launchAtLogin', value)
      app.setLoginItemSettings({ openAtLogin: value })
    } else {
      database.setSetting(key, value)
    }
  })
  ipcMain.on('window:minimize', () => getWindow()?.minimize())
  ipcMain.on('window:toggle-maximize', () => {
    const window = getWindow()
    if (window?.isMaximized()) window.unmaximize()
    else window?.maximize()
  })
  ipcMain.on('window:close', () => getWindow()?.close())
}

export type SettingsUpdate = { key: string; value: AppSettings[string] }
