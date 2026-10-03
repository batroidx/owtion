import { app, BrowserWindow, shell, Tray, Menu, nativeImage } from 'electron'
import { join } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import Store from 'electron-store'
import { registerIpc } from './ipc'
import { initializeDatabase, closeDatabase, database } from './db'
import { buildApplicationMenu } from './menu'

const preferences = new Store<{ launchAtLogin: boolean }>({
  defaults: { launchAtLogin: false }
})

const currentDirectory = dirname(fileURLToPath(import.meta.url))
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let activeLanguage: 'ru' | 'en' = 'ru'

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
    icon: process.platform === 'win32'
      ? app.isPackaged ? join(process.resourcesPath, 'favicon.ico') : join(currentDirectory, '../../favicon/favicon.ico')
      : undefined,
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
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, 'favicon.png')
    : join(currentDirectory, '../../favicon/favicon.png')
  const image = nativeImage.createFromPath(iconPath)
  tray = new Tray(image)
  tray.setToolTip('Owtion')
  tray.setContextMenu(Menu.buildFromTemplate(trayMenu()))
  tray.on('double-click', () => mainWindow?.show())
}

function trayMenu(): Electron.MenuItemConstructorOptions[] {
  const labels = activeLanguage === 'ru'
    ? { open: 'Открыть Owtion', newPage: 'Новая заметка', quit: 'Выход' }
    : { open: 'Open Owtion', newPage: 'New note', quit: 'Quit' }
  return [
    { label: labels.open, click: () => mainWindow?.show() },
    { label: labels.newPage, click: () => { mainWindow?.show(); mainWindow?.webContents.send('app:new-page') } },
    { type: 'separator' },
    { label: labels.quit, click: () => app.quit() }
  ]
}

app.whenReady().then(async () => {
  await initializeDatabase()
  const savedLanguage = database.getSettings().language
  const menuLanguage = savedLanguage === 'en' ? 'en' : 'ru'
  const updateMenuLanguage = (language: 'ru' | 'en'): void => {
    activeLanguage = language
    buildApplicationMenu(() => mainWindow, language)
    tray?.setContextMenu(Menu.buildFromTemplate(trayMenu()))
  }
  activeLanguage = menuLanguage
  registerIpc(() => mainWindow, preferences, updateMenuLanguage)
  buildApplicationMenu(() => mainWindow, menuLanguage)
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
