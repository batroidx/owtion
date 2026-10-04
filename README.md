# Owtion

<img width="1319" height="858" alt="image" src="https://github.com/user-attachments/assets/23790f3d-beec-4c1c-b9ee-952f535d0429" />


A local block-based note editor for Windows, macOS, and Linux. Pages and settings are stored on the device; no network services or telemetry are used.

## Running

```powershell
npm install
npm run dev
```

Building the app and installer:

```powershell
npm run build
npm run make
```

Installers are created in `release/`. The `typecheck` script checks TypeScript, and `lint` runs ESLint.

The app uses `better-sqlite3`. If the native module for the installed Electron version is not built, the main process writes the reason to `owtion-errors.log` and uses Node.js's compatible built-in SQLite driver. In both cases, the schema and database file remain SQLite (`owtion.sqlite`).

## Data and migration

The database is created in Electron's `userData` directory on first launch. Initialization is idempotent (`CREATE TABLE/INDEX IF NOT EXISTS`).

- `pages`: content in JSON format, page tree, and favorites. Deleting a page permanently deletes it and its nested pages.
- `blocks_index`: search index of block text.
- `settings`: user settings.
- `groups`: user-defined page groups with a name and lucide icon; `pages.group_id` sets group membership.

Database errors are written to `owtion-errors.log` next to the database.

## Implemented

- [x] TipTap editor: headings, lists, checklist, quote, code with syntax highlighting, divider, image, callout, table, toggle, and embed.
- [x] `/` menu with fuzzy search, quick blocks, keyboard navigation, and cursor positioning.
- [x] Block movement via handle; block insertion via the `+` button; autosave after 500 ms.
- [x] Page tree with drag-and-drop nesting, favorites, and content search.
- [x] `Ctrl/⌘+K` command palette, light/dark themes, animated table of contents, link graph, and keyboard shortcuts.
- [x] Smooth micro-animations, frosted glass for pop-up menus, and monochrome page icons.
- [x] Markdown/HTML export, structured Markdown import, wiki links with autocomplete and drag-to-link, local settings, and OS autostart.
- [x] Spell-check suggestions in the native editor context menu.
- [x] Frameless titlebar, system menu, and tray menu in Russian.

## SQL schema

```sql
CREATE TABLE pages (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, icon TEXT NOT NULL DEFAULT '📄',
  parent_id TEXT REFERENCES pages(id) ON DELETE SET NULL, content TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  is_favorite INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE blocks_index (
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  block_id TEXT NOT NULL, type TEXT NOT NULL, text TEXT NOT NULL,
  PRIMARY KEY (page_id, block_id)
);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
```
