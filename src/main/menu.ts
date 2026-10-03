import { app, Menu, type BrowserWindow } from 'electron'

export function buildApplicationMenu(getWindow: () => BrowserWindow | null, language: 'ru' | 'en' = 'ru'): void {
  const text = language === 'ru'
    ? { about: 'О приложении Owtion', hide: 'Скрыть', quit: 'Выход', file: 'Файл', newPage: 'Новая страница', export: 'Экспорт в Markdown', edit: 'Правка', undo: 'Отменить', redo: 'Повторить', cut: 'Вырезать', copy: 'Копировать', paste: 'Вставить', selectAll: 'Выбрать всё', view: 'Вид', palette: 'Палитра команд', reload: 'Перезагрузить', devtools: 'Инструменты разработчика', fullscreen: 'Полный экран' }
    : { about: 'About Owtion', hide: 'Hide', quit: 'Quit', file: 'File', newPage: 'New page', export: 'Export as Markdown', edit: 'Edit', undo: 'Undo', redo: 'Redo', cut: 'Cut', copy: 'Copy', paste: 'Paste', selectAll: 'Select all', view: 'View', palette: 'Command palette', reload: 'Reload', devtools: 'Developer tools', fullscreen: 'Toggle full screen' }
  const template: Electron.MenuItemConstructorOptions[] = [
    { label: 'Owtion', submenu: [
      { label: text.about, role: 'about' },
      { type: 'separator' },
      { label: text.hide, role: 'hide' },
      { label: text.quit, accelerator: 'Alt+F4', click: () => app.quit() }
    ] },
    { label: text.file, submenu: [
      { label: text.newPage, accelerator: 'CmdOrCtrl+N', click: () => getWindow()?.webContents.send('app:new-page') },
      { label: text.export, accelerator: 'CmdOrCtrl+Shift+E', click: () => getWindow()?.webContents.send('app:export') }
    ] },
    { label: text.edit, submenu: [
      { role: 'undo', label: text.undo }, { role: 'redo', label: text.redo },
      { type: 'separator' }, { role: 'cut', label: text.cut }, { role: 'copy', label: text.copy },
      { role: 'paste', label: text.paste }, { role: 'selectAll', label: text.selectAll }
    ] },
    { label: text.view, submenu: [
      { label: text.palette, accelerator: 'CmdOrCtrl+K', click: () => getWindow()?.webContents.send('app:command-palette') },
      { role: 'reload', label: text.reload }, { role: 'toggleDevTools', label: text.devtools },
      { role: 'togglefullscreen', label: text.fullscreen }
    ] }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
