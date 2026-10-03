import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { common, createLowlight } from 'lowlight'
import { Callout } from './extensions/Callout'
import { Toggle } from './extensions/Toggle'
import { Embed } from './extensions/Embed'
import { SlashCommand } from './extensions/SlashCommand'
import { usePages } from '../../store/pages'
import { useUi } from '../../store/ui'
import { translate } from '../../lib/i18n'

const lowlight = createLowlight(common)

export interface EditorHandle {
  addTableRow(): void
  addTableColumn(): void
  deleteTableRow(): void
  deleteTableColumn(): void
}

interface EditorProps {
  onTableActiveChange(active: boolean): void
}

const Editor = forwardRef<EditorHandle, EditorProps>(function Editor({ onTableActiveChange }, ref): JSX.Element | null {
  const page = usePages((state) => state.currentPage)
  const setCurrentContent = usePages((state) => state.setCurrentContent)
  const updatePage = usePages((state) => state.update)
  const language = useUi((state) => state.language)
  const wrapper = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideHandleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [handle, setHandle] = useState<{ top: number; left: number; index: number; block: HTMLElement } | null>(null)
  const dragSource = useRef<{ index: number; position: number; node: ProseMirrorNode; element: HTMLElement } | null>(null)
  const dropIndex = useRef<number | null>(null)
  const dropIndicator = useRef<HTMLDivElement>(null)
  const [codeBlockActive, setCodeBlockActive] = useState(false)
  const [codeLanguage, setCodeLanguage] = useState('plaintext')

  const extensions = useMemo(() => [
    StarterKit.configure({ codeBlock: false, heading: { levels: [1, 2, 3] } }),
    CodeBlockLowlight.configure({ lowlight }),
    Underline,
    Link.configure({ openOnClick: false, autolink: true }),
    Image.configure({ allowBase64: true }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    Callout,
    Toggle,
    Embed,
    SlashCommand
  ], [])

  const editor = useEditor({
    extensions,
    content: page?.content,
    editorProps: {
      attributes: { class: 'tiptap', spellcheck: 'true', 'aria-label': translate(language, 'pageEditor') },
      handleKeyDown: (_view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
          editor?.chain().focus().toggleBold().run()
          return true
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'i') {
          editor?.chain().focus().toggleItalic().run()
          return true
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'u') {
          editor?.chain().focus().toggleUnderline().run()
          return true
        }
        if (event.key === 'Tab' && !event.shiftKey) {
          if (editor?.isActive('listItem') || editor?.isActive('taskItem')) {
            editor.chain().focus().sinkListItem(editor.isActive('taskItem') ? 'taskItem' : 'listItem').run()
            return true
          }
        }
        if (event.key === 'Tab' && event.shiftKey && (editor?.isActive('listItem') || editor?.isActive('taskItem'))) {
          editor.chain().focus().liftListItem(editor.isActive('taskItem') ? 'taskItem' : 'listItem').run()
          return true
        }
        return false
      }
    },
    onUpdate: ({ editor: current }) => {
      const content = current.getJSON()
      setCurrentContent(content)
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (page) saveTimer.current = setTimeout(() => { void updatePage(page.id, { content }) }, 500)
    },
    onSelectionUpdate: ({ editor: current }) => {
      const active = current.isActive('codeBlock')
      setCodeBlockActive(active)
      onTableActiveChange(current.isActive('table'))
      if (active) setCodeLanguage(String(current.getAttributes('codeBlock').language ?? 'plaintext'))
    }
  }, [page?.id, onTableActiveChange])

  useImperativeHandle(ref, () => ({
    addTableRow: () => {
      if (editor?.isActive('table')) editor.chain().focus().addRowAfter().run()
    },
    addTableColumn: () => {
      if (editor?.isActive('table')) editor.chain().focus().addColumnAfter().run()
    },
    deleteTableRow: () => {
      if (editor?.isActive('table')) editor.chain().focus().deleteRow().run()
    },
    deleteTableColumn: () => {
      if (editor?.isActive('table')) editor.chain().focus().deleteColumn().run()
    }
  }), [editor])

  useEffect(() => {
    onTableActiveChange(false)
  }, [onTableActiveChange, page?.id])

  useEffect(() => {
    editor?.view.dom.setAttribute('aria-label', translate(language, 'pageEditor'))
    editor?.view.dom.querySelectorAll('details[data-toggle] > summary').forEach((summary) => {
      summary.setAttribute('aria-label', translate(language, 'toggleContent'))
    })
  }, [editor, language])

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (hideHandleTimer.current) clearTimeout(hideHandleTimer.current)
  }, [page?.id])

  const cancelHandleHide = useCallback(() => {
    if (hideHandleTimer.current) clearTimeout(hideHandleTimer.current)
    hideHandleTimer.current = null
  }, [])

  const scheduleHandleHide = useCallback(() => {
    if (hideHandleTimer.current) return
    hideHandleTimer.current = setTimeout(() => {
      setHandle(null)
      hideHandleTimer.current = null
    }, 300)
  }, [])

  const locateBlock = useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLElement) || !wrapper.current || !editor || dragSource.current) return
    if (target.closest('.block-controls')) return
    const block = target.closest<HTMLElement>('.tiptap > *')
    if (!block) { scheduleHandleHide(); return }
    cancelHandleHide()
    const rect = block.getBoundingClientRect()
    const wrapperRect = wrapper.current.getBoundingClientRect()
    const scrollTop = wrapper.current.scrollTop
    const index = Array.from(editor.view.dom.children).indexOf(block)
    if (index < 0 || index >= editor.state.doc.childCount) return
    setHandle((current) => current?.block === block ? current : {
      top: rect.top - wrapperRect.top + scrollTop,
      left: Math.max(4, rect.left - wrapperRect.left - 48),
      index,
      block
    })
  }, [cancelHandleHide, editor, scheduleHandleHide])

  const handlePointerOut = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const target = event.target
    const next = event.relatedTarget
    if (!(target instanceof HTMLElement) || !(next instanceof Node)) return
    const leftBlock = target.closest('.tiptap > *')
    const enteredBlock = next instanceof HTMLElement ? next.closest('.tiptap > *') : null
    const enteredControls = next instanceof HTMLElement && Boolean(next.closest('.block-controls'))
    if (leftBlock && leftBlock !== enteredBlock && !enteredControls) scheduleHandleHide()
  }, [scheduleHandleHide])

  const moveBlock = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    if (!editor || !dragSource.current || dropIndex.current === null) return
    const source = dragSource.current
    if (source.index >= editor.state.doc.childCount || editor.state.doc.child(source.index) !== source.node) return
    const insertionIndex = Math.max(0, Math.min(dropIndex.current, editor.state.doc.childCount))
    const destinationIndex = insertionIndex > source.index ? insertionIndex - 1 : insertionIndex
    if (destinationIndex === source.index) return
    let destination = 0
    for (let index = 0; index < insertionIndex; index += 1) destination += editor.state.doc.child(index).nodeSize
    const transaction = editor.state.tr.delete(source.position, source.position + source.node.nodeSize)
    const adjusted = transaction.mapping.map(destination, insertionIndex > source.index ? -1 : 1)
    if (adjusted < 0 || adjusted > transaction.doc.content.size) return
    transaction.insert(adjusted, source.node)
    editor.view.dispatch(transaction)
    clearDropTarget()
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    if (!dragSource.current || !(event.target instanceof HTMLElement)) return
    const source = dragSource.current
    event.preventDefault()
    const target = event.target.closest<HTMLElement>('.tiptap > *')
    if (!target) return
    const blocks = Array.from(editor?.view.dom.children ?? [])
    const targetIndex = blocks.indexOf(target)
    if (!editor || targetIndex < 0 || targetIndex >= editor.state.doc.childCount) return
    const rect = target.getBoundingClientRect()
    const after = event.clientY > rect.top + rect.height / 2
    const insertionIndex = targetIndex + Number(after)
    if (insertionIndex === source.index || insertionIndex === source.index + 1) {
      clearDropPreview()
      return
    }
    const sourceHeight = source.element.getBoundingClientRect().height + 8
    blocks.forEach((child, index) => {
      if (!(child instanceof HTMLElement)) return
      child.classList.remove('block-drag-source', 'block-drag-shift-up', 'block-drag-shift-down')
      child.style.removeProperty('--drag-shift')
      if (index === source.index) {
        child.classList.add('block-drag-source')
      } else if (insertionIndex > source.index && index > source.index && index < insertionIndex) {
        child.classList.add('block-drag-shift-up')
        child.style.setProperty('--drag-shift', `${sourceHeight}px`)
      } else if (insertionIndex < source.index && index >= insertionIndex && index < source.index) {
        child.classList.add('block-drag-shift-down')
        child.style.setProperty('--drag-shift', `${sourceHeight}px`)
      }
    })
    dropIndex.current = insertionIndex
    const wrapperRect = wrapper.current?.getBoundingClientRect()
    if (dropIndicator.current && wrapperRect) {
      const adjustedRect = target.getBoundingClientRect()
      dropIndicator.current.style.top = `${adjustedRect.top - wrapperRect.top + (wrapper.current?.scrollTop ?? 0) + (after ? adjustedRect.height : 0)}px`
      dropIndicator.current.style.display = 'block'
    }
  }

  const clearDropPreview = (): void => {
    if (editor) {
      Array.from(editor.view.dom.children).forEach((child) => {
        if (!(child instanceof HTMLElement)) return
        child.classList.remove('block-drag-source', 'block-drag-shift-up', 'block-drag-shift-down')
        child.style.removeProperty('--drag-shift')
      })
    }
    dropIndex.current = null
    if (dropIndicator.current) dropIndicator.current.style.display = 'none'
  }

  const clearDropTarget = (): void => {
    clearDropPreview()
    dragSource.current = null
  }

  if (!page) return null
  return (
    <div
      className="editor-scroll"
      ref={wrapper}
      onMouseOver={(event) => locateBlock(event.target)}
      onMouseMove={(event) => locateBlock(event.target)}
      onMouseOut={handlePointerOut}
      onMouseLeave={scheduleHandleHide}
      onDragOver={handleDragOver}
      onDragLeave={(event) => { if (event.target === event.currentTarget) clearDropPreview() }}
      onDrop={moveBlock}
    >
      <div className="block-drop-indicator" ref={dropIndicator} aria-hidden="true" />
      <div className="editor-document">
        <EditorContent editor={editor} />
      </div>
      {codeBlockActive && editor && (
        <div className="language-popover">
          <select
            aria-label={translate(language, 'codeLanguage')}
            value={codeLanguage}
            onChange={(event) => {
              const language = event.currentTarget.value
              setCodeLanguage(language)
              editor.chain().focus().setCodeBlock({ language }).run()
            }}
          >
            {['plaintext', 'javascript', 'typescript', 'tsx', 'jsx', 'python', 'json', 'html', 'css', 'bash', 'sql', 'java', 'go', 'rust', 'yaml', 'markdown'].map((language) => (
              <option key={language} value={language}>{language}</option>
            ))}
          </select>
        </div>
      )}
      {handle && editor && (
        <div
          className="block-controls is-visible"
          style={{ top: handle.top, left: handle.left }}
          onMouseEnter={cancelHandleHide}
          onMouseLeave={scheduleHandleHide}
        >
          <button data-tooltip={translate(language, 'addBlock')} aria-label={translate(language, 'addBlock')} onClick={() => editor.chain().focus().insertContent('/').run()}>+</button>
          <button
            data-tooltip={translate(language, 'moveBlock')}
            aria-label={translate(language, 'moveBlock')}
            draggable
            onDragStart={(event) => {
              const source = editor.state.doc.child(handle.index)
              if (!source) {
                event.preventDefault()
                return
              }
              let position = 0
              for (let index = 0; index < handle.index; index += 1) position += editor.state.doc.child(index).nodeSize
              dragSource.current = { index: handle.index, position, node: source, element: handle.block }
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('application/x-owtion-block', String(handle.index))
              const preview = handle.block.cloneNode(true)
              if (preview instanceof HTMLElement) {
                preview.classList.add('block-drag-preview')
                document.body.append(preview)
                event.dataTransfer.setDragImage(preview, 16, 16)
                requestAnimationFrame(() => preview.remove())
              }
            }}
            onDragEnd={() => { dragSource.current = null; clearDropTarget() }}
          >⠿</button>
        </div>
      )}
    </div>
  )
})

export default Editor
