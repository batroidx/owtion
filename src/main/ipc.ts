import { app, dialog, ipcMain, type BrowserWindow } from 'electron'
import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import type Store from 'electron-store'
import { database } from './db'
import type { AppSettings, PageInput } from '../shared/types'

export function registerIpc(
  getWindow: () => BrowserWindow | null,
  preferences: Store<{ launchAtLogin: boolean }>,
  updateMenuLanguage: (language: 'ru' | 'en') => void
): void {
  ipcMain.handle('pages:list', () => database.listPages())
  ipcMain.handle('pages:trash', () => database.listTrash())
  ipcMain.handle('pages:get', (_event, id: string) => database.getPage(id))
  ipcMain.handle('pages:create', (_event, input: PageInput) => database.createPage(input))
  ipcMain.handle('pages:update', (_event, id: string, updates) => database.updatePage(id, updates))
  ipcMain.handle('pages:delete', (_event, id: string) => database.deletePage(id))
  ipcMain.handle('pages:restore', (_event, id: string) => database.restorePage(id))
  ipcMain.handle('pages:search', (_event, query: string) => database.search(query))
  ipcMain.handle('pages:history', (_event, id: string) => database.getHistory(id))
  ipcMain.handle('groups:list', () => database.listGroups())
  ipcMain.handle('groups:create', (_event, name: string, icon: string) => database.createGroup(name, icon))
  ipcMain.handle('groups:update', (_event, id: string, name: string, icon: string) => database.updateGroup(id, name, icon))
  ipcMain.handle('groups:delete', (_event, id: string) => database.deleteGroup(id))
  ipcMain.handle('settings:get', () => ({ ...database.getSettings(), launchAtLogin: preferences.get('launchAtLogin') }))
  ipcMain.handle('settings:set', (_event, key: string, value: unknown) => {
    if (key === 'launchAtLogin' && typeof value === 'boolean') {
      preferences.set('launchAtLogin', value)
      app.setLoginItemSettings({ openAtLogin: value })
    } else {
      database.setSetting(key, value)
      if (key === 'language' && (value === 'ru' || value === 'en')) updateMenuLanguage(value)
    }
  })
  ipcMain.handle('settings:reset', () => {
    database.resetSettings()
    preferences.set('launchAtLogin', false)
    app.setLoginItemSettings({ openAtLogin: false })
    updateMenuLanguage('ru')
  })
  ipcMain.handle('database:reset', () => database.reset())
  ipcMain.handle('files:choose-image', async () => {
    const window = getWindow()
    const filterName = database.getSettings().language === 'en' ? 'Images' : 'Изображения'
    const filters = [{ name: filterName, extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'] }]
    const result = window
      ? await dialog.showOpenDialog(window, { properties: ['openFile'], filters })
      : await dialog.showOpenDialog({ properties: ['openFile'], filters })
    const path = result.filePaths[0]
    if (result.canceled || !path) return null
    const extension = extname(path).toLowerCase()
    const mime = extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg'
      : extension === '.svg' ? 'image/svg+xml'
        : extension === '.gif' ? 'image/gif'
          : extension === '.webp' ? 'image/webp'
            : extension === '.bmp' ? 'image/bmp' : 'image/png'
    return `data:${mime};base64,${(await readFile(path)).toString('base64')}`
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
