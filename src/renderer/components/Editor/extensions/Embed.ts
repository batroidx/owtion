import { Node, mergeAttributes } from '@tiptap/core'

export const Embed = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  addAttributes() {
    return { url: { default: '' }, title: { default: '' } }
  },
  parseHTML() {
    return [{ tag: 'div[data-embed]' }]
  },
  renderHTML({ HTMLAttributes }) {
    const url = typeof HTMLAttributes.url === 'string' ? HTMLAttributes.url : ''
    const title = typeof HTMLAttributes.title === 'string' && HTMLAttributes.title ? HTMLAttributes.title : url
    return ['div', mergeAttributes(HTMLAttributes, { 'data-embed': 'true', class: 'embed-block' }), ['a', { href: url, target: '_blank', rel: 'noreferrer' }, title]]
  }
})
