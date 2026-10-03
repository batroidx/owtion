import { create } from 'zustand'
import type { JsonNode, Page, PageInput } from '../../shared/types'

interface PagesState {
  pages: Page[]
  currentPage: Page | null
  loading: boolean
  error: string | null
  load: () => Promise<void>
  select: (id: string) => Promise<void>
  create: (input?: PageInput) => Promise<Page>
  update: (id: string, updates: Partial<Pick<Page, 'title' | 'icon' | 'parentId' | 'content' | 'isFavorite'>>) => Promise<void>
  remove: (id: string) => Promise<void>
  setCurrentContent: (content: JsonNode) => void
}

export const usePages = create<PagesState>((set, get) => ({
  pages: [],
  currentPage: null,
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null })
    try {
      const pages = await window.owtion.pages.list()
      set({ pages, loading: false })
      if (!get().currentPage && pages[0]) await get().select(pages[0].id)
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : 'Не удалось загрузить страницы' })
    }
  },
  select: async (id) => {
    try {
      const page = await window.owtion.pages.get(id)
      if (page && !page.deletedAt) set({ currentPage: page })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Не удалось открыть страницу' })
    }
  },
  create: async (input = {}) => {
    const page = await window.owtion.pages.create(input)
    set((state) => ({ pages: [page, ...state.pages], currentPage: page }))
    return page
  },
  update: async (id, updates) => {
    const page = await window.owtion.pages.update(id, updates)
    set((state) => ({
      pages: state.pages.map((item) => item.id === id ? page : item),
      currentPage: state.currentPage?.id === id ? page : state.currentPage
    }))
  },
  remove: async (id) => {
    await window.owtion.pages.delete(id)
    const pages = get().pages.filter((page) => page.id !== id)
    set({ pages, currentPage: get().currentPage?.id === id ? pages[0] ?? null : get().currentPage })
  },
  setCurrentContent: (content) => {
    set((state) => state.currentPage ? { currentPage: { ...state.currentPage, content } } : {})
  }
}))
