import { contextBridge, ipcRenderer } from 'electron'
import type { OwtionApi } from '../shared/types'

const api: OwtionApi = {
  platform: process.platform === 'win32' || process.platform === 'darwin' ? process.platform : 'linux',
  pages: {
    list: () => ipcRenderer.invoke('pages:list'),
    get: (id) => ipcRenderer.invoke('pages:get', id),
    create: (input) => ipcRenderer.invoke('pages:create', input),
    update: (id, updates) => ipcRenderer.invoke('pages:update', id, updates),
    delete: (id) => ipcRenderer.invoke('pages:delete', id),
    search: (query) => ipcRenderer.invoke('pages:search', query),
  },
  groups: {
    list: () => ipcRenderer.invoke('groups:list'),
    create: (name, icon) => ipcRenderer.invoke('groups:create', name, icon),
    update: (id, name, icon) => ipcRenderer.invoke('groups:update', id, name, icon),
    delete: (id) => ipcRenderer.invoke('groups:delete', id)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    reset: () => ipcRenderer.invoke('settings:reset')
  },
  database: {
    reset: () => ipcRenderer.invoke('database:reset')
  },
  files: {
    chooseImage: () => ipcRenderer.invoke('files:choose-image')
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
