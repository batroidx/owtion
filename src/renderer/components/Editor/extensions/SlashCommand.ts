import { Extension } from '@tiptap/core'
import Suggestion, { type SuggestionProps } from '@tiptap/suggestion'
import tippy, { type Instance } from 'tippy.js'
import Fuse from 'fuse.js'
import type { Editor } from '@tiptap/core'

interface SlashItem {
  title: string
  description: string
  aliases: string[]
  type: string
  icon: string
  shortcut: string
  action: (editor: Editor, range: { from: number; to: number }) => void
}

const items: SlashItem[] = [
  { title: 'Текст', description: 'Обычный текстовый блок', aliases: ['paragraph', 'текст'], type: 'paragraph', icon: '¶', shortcut: '', action: (e, r) => e.chain().focus().deleteRange(r).setParagraph().run() },
  { title: 'Заголовок 1', description: 'Большой заголовок', aliases: ['h1', 'heading'], type: 'heading1', icon: 'H1', shortcut: '#', action: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 1 }).run() },
  { title: 'Заголовок 2', description: 'Средний заголовок', aliases: ['h2'], type: 'heading2', icon: 'H2', shortcut: '##', action: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 2 }).run() },
  { title: 'Заголовок 3', description: 'Маленький заголовок', aliases: ['h3'], type: 'heading3', icon: 'H3', shortcut: '###', action: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 3 }).run() },
  { title: 'Маркированный список', description: 'Список с маркерами', aliases: ['bullet', 'list'], type: 'bulletList', icon: '•', shortcut: '- ', action: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
  { title: 'Нумерованный список', description: 'Список с нумерацией', aliases: ['ordered', 'number'], type: 'orderedList', icon: '1.', shortcut: '1. ', action: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
  { title: 'Чек-лист', description: 'Список задач с флажками', aliases: ['task', 'todo'], type: 'taskList', icon: '☑', shortcut: '[] ', action: (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run() },
  { title: 'Toggle', description: 'Сворачиваемый блок', aliases: ['toggle', 'свернуть'], type: 'toggle', icon: '▸', shortcut: '', action: (e, r) => e.chain().focus().deleteRange(r).insertContent({ type: 'toggle', content: [{ type: 'paragraph' }] }).run() },
  { title: 'Цитата', description: 'Блок цитирования', aliases: ['quote'], type: 'blockquote', icon: '❝', shortcut: '> ', action: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
  { title: 'Код', description: 'Блок кода с подсветкой', aliases: ['code'], type: 'codeBlock', icon: '</>', shortcut: '```', action: (e, r) => { const language = window.prompt('Язык программирования (например, javascript, python, tsx):', 'javascript'); if (language !== null) e.chain().focus().deleteRange(r).setCodeBlock({ language: language.trim() || 'plaintext' }).run() } },
  { title: 'Разделитель', description: 'Горизонтальная линия', aliases: ['divider', 'hr'], type: 'divider', icon: '―', shortcut: '---', action: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
  { title: 'Изображение', description: 'Вставить изображение по ссылке', aliases: ['image', 'photo'], type: 'image', icon: '▧', shortcut: '', action: (e, r) => { const src = window.prompt('Ссылка на изображение'); if (src) e.chain().focus().deleteRange(r).setImage({ src }).run() } },
  { title: 'Callout', description: 'Информационный, предупредительный или важный блок', aliases: ['info', 'warning', 'success', 'danger'], type: 'callout', icon: 'ⓘ', shortcut: '', action: (e, r) => { const requested = window.prompt('Тип блока: info, warning, success или danger', 'info'); if (requested !== null) { const kind = ['info', 'warning', 'success', 'danger'].includes(requested.trim().toLowerCase()) ? requested.trim().toLowerCase() : 'info'; e.chain().focus().deleteRange(r).insertContent({ type: 'callout', attrs: { kind }, content: [{ type: 'paragraph' }] }).run() } } },
  { title: 'Таблица', description: 'Таблица 3 × 3', aliases: ['table'], type: 'table', icon: '▦', shortcut: '', action: (e, r) => e.chain().focus().deleteRange(r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { title: 'Embed', description: 'Встроенная ссылка', aliases: ['link', 'embed'], type: 'embed', icon: '↗', shortcut: '', action: (e, r) => { const url = window.prompt('Введите URL'); if (url) e.chain().focus().deleteRange(r).insertContent({ type: 'embed', attrs: { url, title: url } }).run() } }
]

class SlashMenu {
  private component: HTMLDivElement | null = null
  private popup: Instance[] = []
  private selectedIndex = 0
  private current: SuggestionProps<SlashItem> | null = null

  onStart(props: SuggestionProps<SlashItem>): void {
    this.current = props
    this.component = document.createElement('div')
    this.component.className = 'slash-menu'
    this.popup = tippy('body', {
      getReferenceClientRect: props.clientRect as () => DOMRect,
      appendTo: () => document.body,
      content: this.component,
      showOnCreate: true,
      interactive: true,
      trigger: 'manual',
      placement: 'bottom-start',
      theme: 'owtion'
    })
    this.render(props)
  }

  onUpdate(props: SuggestionProps<SlashItem>): void {
    this.current = props
    this.popup[0]?.setProps({ getReferenceClientRect: props.clientRect as () => DOMRect })
    this.render(props)
  }

  onKeyDown({ event }: { event: KeyboardEvent }): boolean {
    if (event.key === 'ArrowDown') { this.selectedIndex += 1; this.render(this.current!); return true }
    if (event.key === 'ArrowUp') { this.selectedIndex -= 1; this.render(this.current!); return true }
    if (event.key === 'Enter') {
      const visible = this.filtered(this.current?.query ?? '')
      visible[((this.selectedIndex % visible.length) + visible.length) % visible.length]?.action(this.current!.editor, this.current!.range)
      return true
    }
    if (event.key === 'Escape') { this.popup[0]?.hide(); return true }
    return false
  }

  onExit(): void {
    this.popup.forEach((instance) => instance.destroy())
    this.popup = []
    this.component = null
    this.current = null
    this.selectedIndex = 0
  }

  private filtered(query: string): SlashItem[] {
    return new Fuse(items, { keys: ['title', 'description', 'aliases'], threshold: 0.4 }).search(query).map((result) => result.item)
  }

  private render(props: SuggestionProps<SlashItem>): void {
    if (!this.component) return
    const visible = this.filtered(props.query)
    this.component.replaceChildren()
    visible.forEach((item, index) => {
      const button = document.createElement('button')
      button.className = index === this.selectedIndex ? 'slash-item active' : 'slash-item'
      button.innerHTML = `<span class="slash-icon">${item.icon}</span><span class="slash-copy"><strong>${item.title}</strong><small>${item.description}</small></span><kbd>${item.shortcut}</kbd>`
      button.addEventListener('mousedown', (event) => {
        event.preventDefault()
        item.action(props.editor, props.range)
      })
      this.component?.append(button)
    })
    if (visible.length === 0) this.component.textContent = 'Команды не найдены'
  }
}

export const SlashCommand = Extension.create({
  name: 'slashCommand',
  addProseMirrorPlugins() {
    return [Suggestion({
      editor: this.editor,
      char: '/',
      allowSpaces: false,
      items: ({ query }) => query
        ? new Fuse(items, { keys: ['title', 'description', 'aliases'], threshold: 0.4 }).search(query).map((result) => result.item)
        : items,
      render: () => new SlashMenu()
    })]
  }
})
