import { app } from 'electron'
import { dirname, join } from 'node:path'
import { mkdirSync, appendFileSync } from 'node:fs'
import { nanoid } from 'nanoid'
import type { Page, PageInput, PageGroup, AppSettings } from '../shared/types'

type SqlValue = string | number | bigint | Uint8Array | null
interface DatabaseStatement {
  run(...params: SqlValue[]): { changes: number | bigint }
  get(...params: SqlValue[]): unknown
  all(...params: SqlValue[]): unknown[]
}
interface DatabaseConnection {
  exec(source: string): void
  prepare(source: string): DatabaseStatement
  close(): void
  pragma?: (source: string) => unknown
}

let db: DatabaseConnection
let databaseOpen = false
const logFile = join(app.getPath('userData'), 'owtion-errors.log')

function logError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.stack ?? error.message : String(error)
  try {
    mkdirSync(dirname(logFile), { recursive: true })
    appendFileSync(logFile, `[${new Date().toISOString()}] ${context}: ${message}\n`)
  } catch (loggingError) {
    console.error('Не удалось записать ошибку в журнал:', loggingError)
    console.error(context, error)
  }
}

function run<T>(context: string, operation: () => T): T {
  try {
    return operation()
  } catch (error) {
    logError(context, error)
    throw error
  }
}

export async function initializeDatabase(): Promise<void> {
  const path = join(app.getPath('userData'), 'owtion.sqlite')
  try {
    const sqlite = await import('better-sqlite3')
    // Разные SQLite-драйверы имеют совместимый sync API, но несовместимые TypeScript-типы.
    db = new sqlite.default(path) as unknown as DatabaseConnection
    db.pragma?.('journal_mode = WAL')
    db.pragma?.('foreign_keys = ON')
  } catch (error) {
    logError('Загрузка better-sqlite3; используется SQLite из Node.js', error)
    const { DatabaseSync } = await import('node:sqlite')
    db = new DatabaseSync(path) as unknown as DatabaseConnection
    db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
  }
  databaseOpen = true
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT NOT NULL DEFAULT 'folder',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS pages (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, icon TEXT NOT NULL DEFAULT '📄',
        parent_id TEXT REFERENCES pages(id) ON DELETE SET NULL, content TEXT NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, is_favorite INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS blocks_index (
        page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        block_id TEXT NOT NULL, type TEXT NOT NULL, text TEXT NOT NULL,
        PRIMARY KEY (page_id, block_id)
      );
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_pages_updated ON pages(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_pages_parent ON pages(parent_id);
    `)
    db.exec('DROP TABLE IF EXISTS history;')
    const pageColumns = db.prepare('PRAGMA table_info(pages)').all() as Array<{ name: string }>
    if (pageColumns.some((column) => column.name === 'deleted_at')) {
      db.exec('UPDATE pages SET deleted_at=NULL WHERE deleted_at IS NOT NULL')
    }
    if (!pageColumns.some((column) => column.name === 'group_id')) {
      db.exec('ALTER TABLE pages ADD COLUMN group_id TEXT REFERENCES groups(id) ON DELETE SET NULL')
    }
  } catch (error) {
    logError('Инициализация SQLite', error)
    throw error
  }
}

export function closeDatabase(): void {
  if (databaseOpen) {
    db.close()
    databaseOpen = false
  }
}

function toPage(row: Record<string, unknown>): Page {
  return {
    id: String(row.id), title: String(row.title), icon: String(row.icon),
    parentId: row.parent_id === null ? null : String(row.parent_id),
    groupId: row.group_id === null || row.group_id === undefined ? null : String(row.group_id),
    content: JSON.parse(String(row.content)) as Page['content'],
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
    isFavorite: Number(row.is_favorite) === 1
  }
}

export const database = {
  listPages: (): Page[] => run('Список страниц', () => {
    return (db.prepare('SELECT * FROM pages ORDER BY updated_at DESC').all() as Record<string, unknown>[]).map(toPage)
  }),
  getPage: (id: string): Page | null => run('Получение страницы', () => {
    const row = db.prepare('SELECT * FROM pages WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? toPage(row) : null
  }),
  createPage: (input: PageInput): Page => run('Создание страницы', () => {
    const now = new Date().toISOString()
    const page: Page = {
      id: nanoid(), title: input.title || 'Без названия', icon: input.icon || '📄',
      parentId: input.parentId ?? null, groupId: input.groupId ?? null,
      content: input.content ?? { type: 'doc', content: [{ type: 'paragraph' }] },
      createdAt: now, updatedAt: now, isFavorite: false
    }
    db.prepare('INSERT INTO pages (id,title,icon,parent_id,group_id,content,created_at,updated_at,is_favorite) VALUES (?,?,?,?,?,?,?,?,0)')
      .run(page.id, page.title, page.icon, page.parentId, page.groupId, JSON.stringify(page.content), now, now)
    return page
  }),
  updatePage: (id: string, updates: Partial<Pick<Page, 'title' | 'icon' | 'parentId' | 'groupId' | 'content' | 'isFavorite'>>): Page => run('Сохранение страницы', () => {
    const existing = database.getPage(id)
    if (!existing) throw new Error(`Страница ${id} не найдена`)
    if (updates.parentId) {
      let parent = database.getPage(updates.parentId)
      while (parent) {
        if (parent.id === id) throw new Error('Нельзя вложить страницу в саму себя или её дочернюю страницу')
        parent = parent.parentId ? database.getPage(parent.parentId) : null
      }
    }
    const next = { ...existing, ...updates, updatedAt: new Date().toISOString() }
    db.prepare('UPDATE pages SET title=?,icon=?,parent_id=?,group_id=?,content=?,updated_at=?,is_favorite=? WHERE id=?')
      .run(next.title, next.icon, next.parentId, next.groupId, JSON.stringify(next.content), next.updatedAt, Number(next.isFavorite), id)
    if (updates.groupId !== undefined) {
      db.prepare(`WITH RECURSIVE descendants(id) AS (
        SELECT id FROM pages WHERE parent_id=?
        UNION ALL SELECT pages.id FROM pages JOIN descendants ON pages.parent_id=descendants.id
      ) UPDATE pages SET group_id=? WHERE id IN (SELECT id FROM descendants)`).run(id, updates.groupId)
    }
    if (updates.content) rebuildIndex(id, updates.content)
    return next
  }),
  deletePage: (id: string): void => run('Удаление страницы', () => {
    db.prepare(`WITH RECURSIVE descendants(id) AS (
      SELECT id FROM pages WHERE id=?
      UNION ALL SELECT pages.id FROM pages JOIN descendants ON pages.parent_id=descendants.id
    ) DELETE FROM pages WHERE id IN (SELECT id FROM descendants)`).run(id)
  }),
  search: (query: string): Page[] => run('Поиск страниц', () => {
    if (!query.trim()) return []
    const needle = `%${query.replace(/[%_]/g, '\\$&')}%`
    return (db.prepare(`SELECT DISTINCT p.* FROM pages p LEFT JOIN blocks_index b ON p.id=b.page_id
      WHERE (p.title LIKE ? ESCAPE '\\' OR b.text LIKE ? ESCAPE '\\')
      ORDER BY p.updated_at DESC LIMIT 100`).all(needle, needle) as Record<string, unknown>[]).map(toPage)
  }),
  getSettings: (): AppSettings => run('Чтение настроек', () => {
    const values = db.prepare('SELECT key,value FROM settings').all() as Array<{ key: string; value: string }>
    return values.reduce<AppSettings>((settings, item) => {
      settings[item.key] = JSON.parse(item.value) as AppSettings[string]
      return settings
    }, {})
  }),
  setSetting: (key: string, value: unknown): void => run('Сохранение настроек', () => {
    db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
      .run(key, JSON.stringify(value))
  }),
  reset: (): void => run('Сброс базы данных', () => {
    db.exec('BEGIN IMMEDIATE')
    try {
      db.exec('DELETE FROM blocks_index; DELETE FROM pages; DELETE FROM groups; COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }),
  resetSettings: (): void => run('Сброс настроек', () => {
    db.prepare('DELETE FROM settings').run()
  }),
  listGroups: (): PageGroup[] => run('Список групп', () =>
    (db.prepare('SELECT id,name,icon,created_at FROM groups ORDER BY created_at').all() as Array<Record<string, unknown>>)
      .map((row) => ({ id: String(row.id), name: String(row.name), icon: String(row.icon), createdAt: String(row.created_at) }))
  ),
  createGroup: (name: string, icon: string): PageGroup => run('Создание группы', () => {
    const group = { id: nanoid(), name: name.trim(), icon, createdAt: new Date().toISOString() }
    if (!group.name) throw new Error('Название группы не может быть пустым')
    db.prepare('INSERT INTO groups (id,name,icon,created_at) VALUES (?,?,?,?)').run(group.id, group.name, group.icon, group.createdAt)
    return group
  }),
  updateGroup: (id: string, name: string, icon: string): PageGroup => run('Изменение группы', () => {
    const current = db.prepare('SELECT created_at FROM groups WHERE id=?').get(id) as { created_at: string } | undefined
    if (!current) throw new Error(`Группа ${id} не найдена`)
    const group = { id, name: name.trim(), icon, createdAt: current.created_at }
    if (!group.name) throw new Error('Название группы не может быть пустым')
    const result = db.prepare('UPDATE groups SET name=?,icon=? WHERE id=?').run(group.name, group.icon, id)
    if (Number(result.changes) === 0) throw new Error(`Группа ${id} не найдена`)
    return group
  }),
  deleteGroup: (id: string): void => run('Удаление группы', () => {
    db.prepare('UPDATE pages SET group_id=NULL, parent_id=NULL WHERE group_id=?').run(id)
    db.prepare('DELETE FROM groups WHERE id=?').run(id)
  })
}

function rebuildIndex(pageId: string, content: Page['content']): void {
  db.prepare('DELETE FROM blocks_index WHERE page_id=?').run(pageId)
  const insert = db.prepare('INSERT INTO blocks_index (page_id,block_id,type,text) VALUES (?,?,?,?)')
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    const value = node as { type?: string; attrs?: { id?: string }; text?: string; content?: unknown[] }
    if (value.type) {
      const text = value.text ?? (value.content ?? []).map((child) => {
        if (child && typeof child === 'object' && 'text' in child) return String(child.text)
        return ''
      }).join(' ')
      insert.run(pageId, value.attrs?.id ?? nanoid(), value.type, text)
    }
    value.content?.forEach(walk)
  }
  walk(content)
}
