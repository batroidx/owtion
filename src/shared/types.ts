export interface JsonNode {
  type: string
  attrs?: Record<string, string | number | boolean | null>
  content?: JsonNode[]
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, string> }>
}

export interface Page {
  id: string
  title: string
  icon: string
  parentId: string | null
  groupId: string | null
  content: JsonNode
  createdAt: string
  updatedAt: string
  isFavorite: boolean
  deletedAt: string | null
}

export interface PageGroup {
  id: string
  name: string
  icon: string
  createdAt: string
}

export type PageInput = Partial<Pick<Page, 'title' | 'icon' | 'parentId' | 'groupId' | 'content'>>
export type AppSettings = Record<string, string | number | boolean | null>

export interface OwtionApi {
  platform: 'win32' | 'darwin' | 'linux'
  pages: {
    list(): Promise<Page[]>
    trash(): Promise<Page[]>
    get(id: string): Promise<Page | null>
    create(input: PageInput): Promise<Page>
    update(id: string, updates: Partial<Pick<Page, 'title' | 'icon' | 'parentId' | 'groupId' | 'content' | 'isFavorite'>>): Promise<Page>
    delete(id: string): Promise<void>
    restore(id: string): Promise<void>
    search(query: string): Promise<Page[]>
    history(id: string): Promise<Array<{ id: number; content: JsonNode; createdAt: string }>>
  }
  groups: {
    list(): Promise<PageGroup[]>
    create(name: string, icon: string): Promise<PageGroup>
    update(id: string, name: string, icon: string): Promise<PageGroup>
    delete(id: string): Promise<void>
  }
  settings: {
    get(): Promise<AppSettings>
    set(key: string, value: unknown): Promise<void>
    reset(): Promise<void>
  }
  database: {
    reset(): Promise<void>
  }
  files: {
    chooseImage(): Promise<string | null>
  }
  window: {
    minimize(): void
    toggleMaximize(): void
    close(): void
  }
  on(channel: 'app:new-page' | 'app:command-palette' | 'app:export', callback: () => void): () => void
}
