import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
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
import { common, createLowlight } from 'lowlight'
import { Callout } from './extensions/Callout'
import { Toggle } from './extensions/Toggle'
import { Embed } from './extensions/Embed'
import { SlashCommand } from './extensions/SlashCommand'
import { usePages } from '../../store/pages'

const lowlight = createLowlight(common)

export default function Editor(): JSX.Element | null {
  const page = usePages((state) => state.currentPage)
  const setCurrentContent = usePages((state) => state.setCurrentContent)
  const updatePage = usePages((state) => state.update)
  const wrapper = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [handle, setHandle] = useState<{ top: number; left: number; position: number; block: HTMLElement } | null>(null)
  const [dragPosition, setDragPosition] = useState<number | null>(null)

  const extensions = useMemo(() => [
    StarterKit.configure({ codeBlock: false, heading: { levels: [1, 2, 3] } }),
    CodeBlockLowlight.configure({ lowlight }),
    Placeholder.configure({ placeholder: 'Начните писать или введите / для команд…' }),
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
      attributes: { class: 'tiptap', spellcheck: 'true', 'aria-label': 'Редактор страницы' },
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
    }
  }, [page?.id])

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
  }, [page?.id])

  const locateBlock = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const target = event.target
    if (!(target instanceof HTMLElement) || !wrapper.current || !editor) return
    if (target.closest('.block-controls')) return
    const block = target.closest<HTMLElement>('.tiptap > *')
    if (!block) { setHandle(null); return }
    const rect = block.getBoundingClientRect()
    const wrapperRect = wrapper.current.getBoundingClientRect()
    const scrollTop = wrapper.current.scrollTop
    const position = editor.view.posAtDOM(block, 0)
    setHandle((current) => current?.block === block ? current : {
      top: rect.top - wrapperRect.top + scrollTop,
      left: Math.max(4, rect.left - wrapperRect.left - 48),
      position,
      block
    })
  }, [editor])

  const moveBlock = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    if (!editor || dragPosition === null) return
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    const block = target.closest<HTMLElement>('.tiptap > *')
    if (!block) return
    const destination = editor.view.posAtDOM(block, 0)
    const source = editor.state.doc.nodeAt(dragPosition)
    if (!source || destination === dragPosition || destination === dragPosition + source.nodeSize) return
    const transaction = editor.state.tr.delete(dragPosition, dragPosition + source.nodeSize)
    const adjusted = destination > dragPosition ? destination - source.nodeSize : destination
    transaction.insert(adjusted, source)
    editor.view.dispatch(transaction)
    setDragPosition(null)
  }

  if (!page) return null
  return (
    <div className="editor-scroll" ref={wrapper} onMouseMove={locateBlock} onDragOver={(event) => event.preventDefault()} onDrop={moveBlock}>
      <div className="editor-document">
        <EditorContent editor={editor} />
      </div>
      {handle && editor && (
        <div className="block-controls" style={{ top: handle.top, left: handle.left }}>
          <button title="Добавить блок" aria-label="Добавить блок" onClick={() => editor.chain().focus().insertContent('/').run()}>+</button>
          <button
            title="Переместить блок"
            aria-label="Переместить блок"
            draggable
            onDragStart={(event) => { setDragPosition(handle.position); event.dataTransfer.effectAllowed = 'move' }}
          >⠿</button>
        </div>
      )}
    </div>
  )
}
