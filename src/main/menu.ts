import { app, Menu, type BrowserWindow } from 'electron'

export function buildApplicationMenu(getWindow: () => BrowserWindow | null): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    { label: 'Owtion', submenu: [
      { label: 'О приложении Owtion', role: 'about' },
      { type: 'separator' },
      { label: 'Скрыть', role: 'hide' },
      { label: 'Выход', accelerator: 'Alt+F4', click: () => app.quit() }
    ] },
    { label: 'Файл', submenu: [
      { label: 'Новая страница', accelerator: 'CmdOrCtrl+N', click: () => getWindow()?.webContents.send('app:new-page') },
      { label: 'Экспорт в Markdown', accelerator: 'CmdOrCtrl+Shift+E', click: () => getWindow()?.webContents.send('app:export') }
    ] },
    { label: 'Правка', submenu: [
      { role: 'undo', label: 'Отменить' }, { role: 'redo', label: 'Повторить' },
      { type: 'separator' }, { role: 'cut', label: 'Вырезать' }, { role: 'copy', label: 'Копировать' },
      { role: 'paste', label: 'Вставить' }, { role: 'selectAll', label: 'Выбрать всё' }
    ] },
    { label: 'Вид', submenu: [
      { label: 'Палитра команд', accelerator: 'CmdOrCtrl+K', click: () => getWindow()?.webContents.send('app:command-palette') },
      { role: 'reload', label: 'Перезагрузить' }, { role: 'toggleDevTools', label: 'Инструменты разработчика' },
      { role: 'togglefullscreen', label: 'Полный экран' }
    ] }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
