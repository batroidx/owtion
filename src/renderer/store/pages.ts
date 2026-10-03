import { create } from 'zustand'
import type { JsonNode, Page, PageGroup, PageInput } from '../../shared/types'
import { useUi } from './ui'

interface PagesState {
  pages: Page[]
  groups: PageGroup[]
  currentPage: Page | null
  loading: boolean
  error: string | null
  load: () => Promise<void>
  loadGroups: () => Promise<void>
  createGroup: (name: string, icon: string) => Promise<void>
  updateGroup: (id: string, name: string, icon: string) => Promise<void>
  deleteGroup: (id: string) => Promise<void>
  select: (id: string) => Promise<void>
  create: (input?: PageInput) => Promise<Page>
  update: (id: string, updates: Partial<Pick<Page, 'title' | 'icon' | 'parentId' | 'groupId' | 'content' | 'isFavorite'>>) => Promise<void>
  remove: (id: string) => Promise<void>
  setCurrentContent: (content: JsonNode) => void
}

export const usePages = create<PagesState>((set, get) => ({
  pages: [],
  groups: [],
  currentPage: null,
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null })
    try {
      const pages = await window.owtion.pages.list()
      const currentPage = get().currentPage
      set({
        pages,
        loading: false,
        currentPage: currentPage ? pages.find((page) => page.id === currentPage.id) ?? currentPage : null
      })
      if (!get().currentPage && pages[0]) await get().select(pages[0].id)
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : 'Не удалось загрузить страницы' })
    }
  },
  loadGroups: async () => {
    const groups = await window.owtion.groups.list()
    set({ groups })
  },
  createGroup: async (name, icon) => {
    const group = await window.owtion.groups.create(name, icon)
    set((state) => ({ groups: [...state.groups, group] }))
  },
  updateGroup: async (id, name, icon) => {
    const group = await window.owtion.groups.update(id, name, icon)
    set((state) => ({ groups: state.groups.map((item) => item.id === id ? group : item) }))
  },
  deleteGroup: async (id) => {
    await window.owtion.groups.delete(id)
    set((state) => ({
      groups: state.groups.filter((group) => group.id !== id),
      pages: state.pages.map((page) => page.groupId === id ? { ...page, groupId: null, parentId: null } : page),
      currentPage: state.currentPage?.groupId === id ? { ...state.currentPage, groupId: null, parentId: null } : state.currentPage
    }))
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
    const title = input.title ?? (useUi.getState().language === 'ru' ? 'Без названия' : 'Untitled')
    const page = await window.owtion.pages.create({ ...input, title })
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
