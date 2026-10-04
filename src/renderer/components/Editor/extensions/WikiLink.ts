import { Mark } from '@tiptap/core'
import Suggestion, { type SuggestionProps } from '@tiptap/suggestion'
import { PluginKey } from '@tiptap/pm/state'
import tippy, { type Instance } from 'tippy.js'
import Fuse from 'fuse.js'
import type { Page } from '../../../../shared/types'
import { usePages } from '../../../store/pages'
import { useUi } from '../../../store/ui'

interface WikiSuggestionItem {
  page: Page
  groupName: string
}

const wikiSuggestionKey = new PluginKey('wikiLinkSuggestion')

class WikiLinkMenu {
  private element: HTMLDivElement | null = null
  private popup: Instance[] = []
  private selectedIndex = 0
  private props: SuggestionProps<WikiSuggestionItem> | null = null

  onStart(props: SuggestionProps<WikiSuggestionItem>): void {
    this.props = props
    this.element = document.createElement('div')
    this.element.className = 'slash-menu wiki-link-menu'
    this.popup = tippy('body', {
      getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect(),
      appendTo: () => document.body,
      content: this.element,
      showOnCreate: true,
      interactive: true,
      trigger: 'manual',
      placement: 'bottom-start',
      theme: 'owtion'
    })
    this.render(props)
  }

  onUpdate(props: SuggestionProps<WikiSuggestionItem>): void {
    this.props = props
    this.popup[0]?.setProps({ getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect() })
    this.render(props)
  }

  onKeyDown({ event }: { event: KeyboardEvent }): boolean {
    const props = this.props
    if (!props) return false
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (props.items.length === 0) return false
      event.preventDefault()
      this.selectedIndex = (this.selectedIndex + (event.key === 'ArrowDown' ? 1 : -1) + props.items.length) % props.items.length
      this.render(props)
      return true
    }
    if (event.key === 'Enter' && props.items[this.selectedIndex]) {
      event.preventDefault()
      props.command(props.items[this.selectedIndex])
      return true
    }
    if (event.key === 'Escape') {
      this.popup[0]?.hide()
      return true
    }
    return false
  }

  onExit(): void {
    this.popup.forEach((instance) => instance.destroy())
    this.popup = []
    this.element = null
    this.props = null
    this.selectedIndex = 0
  }

  private render(props: SuggestionProps<WikiSuggestionItem>): void {
    if (!this.element) return
    this.element.replaceChildren()
    if (props.items.length === 0) {
      this.element.textContent = useUi.getState().language === 'ru' ? 'Страницы не найдены' : 'No pages found'
      return
    }
    if (this.selectedIndex >= props.items.length) this.selectedIndex = 0
    props.items.forEach((item, index) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = `slash-item${index === this.selectedIndex ? ' active' : ''}`
      button.dataset.index = String(index)
      const title = document.createElement('strong')
      title.textContent = item.page.title
      const path = document.createElement('small')
      path.textContent = `${item.groupName} 🡲 ${item.page.title}`
      const copy = document.createElement('span')
      copy.className = 'slash-copy'
      copy.append(title, path)
      button.append(copy)
      button.addEventListener('mousedown', (event) => {
        event.preventDefault()
        props.command(item)
      })
      this.element?.append(button)
    })
    this.element.querySelector<HTMLElement>(`[data-index="${this.selectedIndex}"]`)?.scrollIntoView({ block: 'nearest' })
  }
}

export const WikiLink = Mark.create({
  name: 'wikiLink',
  inclusive: false,

  addAttributes() {
    return {
      pageId: { default: '' },
      groupName: { default: '' },
      pageTitle: { default: '' }
    }
  },

  parseHTML() {
    return [{
      tag: 'span[data-wiki-link]',
      getAttrs: (element) => {
        if (!(element instanceof HTMLElement)) return false
        return {
          pageId: element.dataset.pageId ?? '',
          groupName: element.dataset.groupName ?? '',
          pageTitle: element.dataset.pageTitle ?? ''
        }
      }
    }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', {
      'data-wiki-link': 'true',
      'data-page-id': HTMLAttributes.pageId,
      'data-group-name': HTMLAttributes.groupName,
      'data-page-title': HTMLAttributes.pageTitle,
      class: 'wiki-link'
    }, 0]
  },

  addProseMirrorPlugins() {
    return [Suggestion<WikiSuggestionItem>({
      pluginKey: wikiSuggestionKey,
      editor: this.editor,
      char: '[[',
      allowSpaces: true,
      allowedPrefixes: null,
      findSuggestionMatch: ({ $position }) => {
        const before = $position.parent.textBetween(0, $position.parentOffset, '\n', '\n')
        const match = /(?:^|\s)\[\[([^[\]]*)$/.exec(before)
        if (!match) return null
        const query = match[1]
        const from = $position.start() + before.length - query.length - 2
        return { range: { from, to: $position.pos }, query, text: `[[${query}` }
      },
      items: ({ query }) => {
        const { pages, groups } = usePages.getState()
        const candidates = pages.map((page) => ({
          page,
          groupName: groups.find((group) => group.id === page.groupId)?.name ?? (useUi.getState().language === 'ru' ? 'Личное' : 'Personal')
        }))
        if (!query.trim()) return candidates.slice(0, 8)
        return new Fuse(candidates, {
          keys: ['page.title', 'groupName'],
          threshold: 0.42
        }).search(query.replace(/\]\]$/, '').replace(':', ' ')).slice(0, 8).map((result) => result.item)
      },
      command: ({ editor, range, props }) => {
        editor.chain().focus().deleteRange(range).insertContent({
          type: 'text',
          text: props.page.title,
          marks: [{
            type: 'wikiLink',
            attrs: {
              pageId: props.page.id,
              groupName: props.groupName,
              pageTitle: props.page.title
            }
          }]
        }).run()
      },
      render: () => new WikiLinkMenu()
    })]
  }
})
