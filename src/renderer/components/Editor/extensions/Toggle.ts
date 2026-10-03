import { Node, mergeAttributes } from '@tiptap/core'

export const Toggle = Node.create({
  name: 'toggle',
  group: 'block',
  content: 'block+',
  defining: true,
  parseHTML() {
    return [{ tag: 'details[data-toggle]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['details', mergeAttributes(HTMLAttributes, { 'data-toggle': 'true', class: 'toggle-block' }), ['summary', { 'aria-label': 'Toggle content' }], ['div', { class: 'toggle-content' }, 0]]
  }
})
