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
  content: JsonNode
  createdAt: string
  updatedAt: string
  isFavorite: boolean
  deletedAt: string | null
}

export type PageInput = Partial<Pick<Page, 'title' | 'icon' | 'parentId' | 'content'>>
export type AppSettings = Record<string, string | number | boolean | null>

export interface OwtionApi {
  platform: 'win32' | 'darwin' | 'linux'
  pages: {
    list(): Promise<Page[]>
    trash(): Promise<Page[]>
    get(id: string): Promise<Page | null>
    create(input: PageInput): Promise<Page>
    update(id: string, updates: Partial<Pick<Page, 'title' | 'icon' | 'parentId' | 'content' | 'isFavorite'>>): Promise<Page>
    delete(id: string): Promise<void>
    restore(id: string): Promise<void>
    search(query: string): Promise<Page[]>
    history(id: string): Promise<Array<{ id: number; content: JsonNode; createdAt: string }>>
  }
  settings: {
    get(): Promise<AppSettings>
    set(key: string, value: unknown): Promise<void>
  }
  window: {
    minimize(): void
    toggleMaximize(): void
    close(): void
  }
  on(channel: 'app:new-page' | 'app:command-palette' | 'app:export', callback: () => void): () => void
}
