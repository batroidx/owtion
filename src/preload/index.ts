import { contextBridge, ipcRenderer } from 'electron'
import type { OwtionApi } from '../shared/types'

const api: OwtionApi = {
  platform: process.platform === 'win32' || process.platform === 'darwin' ? process.platform : 'linux',
  pages: {
    list: () => ipcRenderer.invoke('pages:list'),
    trash: () => ipcRenderer.invoke('pages:trash'),
    get: (id) => ipcRenderer.invoke('pages:get', id),
    create: (input) => ipcRenderer.invoke('pages:create', input),
    update: (id, updates) => ipcRenderer.invoke('pages:update', id, updates),
    delete: (id) => ipcRenderer.invoke('pages:delete', id),
    restore: (id) => ipcRenderer.invoke('pages:restore', id),
    search: (query) => ipcRenderer.invoke('pages:search', query),
    history: (id) => ipcRenderer.invoke('pages:history', id)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value)
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    close: () => ipcRenderer.send('window:close')
  },
  on: (channel, callback) => {
    const listener = (): void => callback()
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  }
}

contextBridge.exposeInMainWorld('owtion', api)
