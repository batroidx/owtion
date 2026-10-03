import { app, BrowserWindow, shell, Tray, Menu, nativeImage } from 'electron'
import { join } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import Store from 'electron-store'
import { registerIpc } from './ipc'
import { initializeDatabase, closeDatabase } from './db'
import { buildApplicationMenu } from './menu'

const preferences = new Store<{ launchAtLogin: boolean }>({
  defaults: { launchAtLogin: false }
})

const currentDirectory = dirname(fileURLToPath(import.meta.url))
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 900,
    minHeight: 620,
    frame: process.platform === 'darwin',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
    trafficLightPosition: process.platform === 'darwin' ? { x: 12, y: 11 } : undefined,
    backgroundColor: '#ffffff',
    vibrancy: process.platform === 'darwin' ? 'under-window' : undefined,
    visualEffectState: process.platform === 'darwin' ? 'active' : undefined,
    backgroundMaterial: process.platform === 'win32' ? 'acrylic' : undefined,
    transparent: process.platform === 'darwin',
    title: 'Owtion',
    webPreferences: {
      preload: join(currentDirectory, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  mainWindow.on('closed', () => { mainWindow = null })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(join(currentDirectory, '../renderer/index.html'))
  }
}

function createTray(): void {
  const image = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pV8AAAAASUVORK5CYII='
  )
  tray = new Tray(image)
  tray.setToolTip('Owtion')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Открыть Owtion', click: () => mainWindow?.show() },
    { label: 'Новая заметка', click: () => { mainWindow?.show(); mainWindow?.webContents.send('app:new-page') } },
    { type: 'separator' },
    { label: 'Выход', click: () => app.quit() }
  ]))
  tray.on('double-click', () => mainWindow?.show())
}

app.whenReady().then(async () => {
  await initializeDatabase()
  registerIpc(() => mainWindow, preferences)
  buildApplicationMenu(() => mainWindow)
  createWindow()
  createTray()
  const launchAtLogin = preferences.get('launchAtLogin')
  app.setLoginItemSettings({ openAtLogin: launchAtLogin })
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', closeDatabase)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
