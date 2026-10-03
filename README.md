# Owtion

Локальный блочный редактор заметок для Windows, macOS и Linux. Страницы и настройки сохраняются на устройстве; сетевые сервисы и телеметрия не используются.

## Запуск

```powershell
npm install
npm run dev
```

Сборка приложения и установщика:

```powershell
npm run build
npm run make
```

Установщики создаются в `release/`. Скрипт `typecheck` проверяет TypeScript, `lint` запускает ESLint.

В приложении используется `better-sqlite3`. Если нативный модуль для установленной версии Electron не собран, main-процесс записывает причину в `owtion-errors.log` и использует совместимый встроенный SQLite-драйвер Node.js. В обоих случаях схема и файл базы остаются SQLite (`owtion.sqlite`).

## Данные и миграция

База создаётся в каталоге `userData` Electron при первом запуске. Инициализация идемпотентна (`CREATE TABLE/INDEX IF NOT EXISTS`).

- `pages`: содержимое в формате JSON, дерево страниц, избранное и время удаления.
- `blocks_index`: поисковый индекс текста блоков.
- `settings`: пользовательские настройки.
- `history`: предыдущие версии содержимого, не более 50 на страницу.

Ошибки БД записываются в `owtion-errors.log` рядом с базой.

## Реализовано

- [x] Редактор на TipTap: заголовки, списки, чек-лист, цитата, код с подсветкой, разделитель, изображение, callout, таблица, toggle и embed.
- [x] Меню `/` с fuzzy-поиском, быстрыми блоками, клавиатурной навигацией и позиционированием у курсора.
- [x] Перемещение блока за handle; вставка блока кнопкой `+`; автосохранение через 500 мс.
- [x] Дерево страниц с drag-and-drop-вложенностью, избранное, недавние, поиск по содержимому и корзина с восстановлением.
- [x] Палитра команд `Ctrl/⌘+K`, светлая/тёмная темы, оглавление и горячие клавиши.
- [x] Экспорт Markdown/HTML, импорт Markdown, история версий, локальные настройки и автозапуск ОС.
- [x] Frameless titlebar, системное меню и tray-меню на русском языке.

## SQL-схема

```sql
CREATE TABLE pages (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, icon TEXT NOT NULL DEFAULT '📄',
  parent_id TEXT REFERENCES pages(id) ON DELETE SET NULL, content TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  is_favorite INTEGER NOT NULL DEFAULT 0, deleted_at TEXT
);
CREATE TABLE blocks_index (
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  block_id TEXT NOT NULL, type TEXT NOT NULL, text TEXT NOT NULL,
  PRIMARY KEY (page_id, block_id)
);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  content TEXT NOT NULL, created_at TEXT NOT NULL
);
```
