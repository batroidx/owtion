import { Node, mergeAttributes } from '@tiptap/core'

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return { kind: { default: 'info', rendered: true } }
  },
  parseHTML() {
    return [{ tag: 'aside[data-callout]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['aside', mergeAttributes(HTMLAttributes, { 'data-callout': 'true', class: 'callout' }), 0]
  }
})
