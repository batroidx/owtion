import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
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
  const hideHandleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropTarget = useRef<HTMLElement | null>(null)
  const [handle, setHandle] = useState<{ top: number; left: number; position: number; block: HTMLElement } | null>(null)
  const [dragPosition, setDragPosition] = useState<number | null>(null)
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
    },
    onSelectionUpdate: ({ editor: current }) => {
      const active = current.isActive('codeBlock')
      setCodeBlockActive(active)
      if (active) setCodeLanguage(String(current.getAttributes('codeBlock').language ?? 'plaintext'))
    }
  }, [page?.id])

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
    if (!(target instanceof HTMLElement) || !wrapper.current || !editor) return
    if (target.closest('.block-controls')) return
    const block = target.closest<HTMLElement>('.tiptap > *')
    if (!block) { scheduleHandleHide(); return }
    cancelHandleHide()
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
    if (!editor || dragPosition === null) return
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    const block = target.closest<HTMLElement>('.tiptap > *')
    if (!block) return
    const rect = block.getBoundingClientRect()
    const after = event.clientY > rect.top + rect.height / 2
    const destination = editor.view.posAtDOM(block, 0) + (after ? editor.state.doc.nodeAt(editor.view.posAtDOM(block, 0))?.nodeSize ?? 0 : 0)
    const source = editor.state.doc.nodeAt(dragPosition)
    if (!source || destination === dragPosition || destination === dragPosition + source.nodeSize) return
    const transaction = editor.state.tr.delete(dragPosition, dragPosition + source.nodeSize)
    const adjusted = destination > dragPosition ? destination - source.nodeSize : destination
    transaction.insert(adjusted, source)
    editor.view.dispatch(transaction)
    setDragPosition(null)
    block.classList.remove('block-drop-before', 'block-drop-after')
    dropTarget.current = null
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    if (dragPosition === null || !(event.target instanceof HTMLElement)) return
    const target = event.target.closest<HTMLElement>('.tiptap > *')
    if (!target) return
    if (dropTarget.current && dropTarget.current !== target) dropTarget.current.classList.remove('block-drop-before', 'block-drop-after')
    const rect = target.getBoundingClientRect()
    const after = event.clientY > rect.top + rect.height / 2
    target.classList.toggle('block-drop-after', after)
    target.classList.toggle('block-drop-before', !after)
    dropTarget.current = target
  }

  const clearDropTarget = (): void => {
    dropTarget.current?.classList.remove('block-drop-before', 'block-drop-after')
    dropTarget.current = null
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
      onDragLeave={(event) => { if (event.target === event.currentTarget) clearDropTarget() }}
      onDrop={moveBlock}
    >
      <div className="editor-document">
        <EditorContent editor={editor} />
      </div>
      {codeBlockActive && editor && (
        <div className="language-popover">
          <select
            aria-label="Язык блока кода"
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
          <button data-tooltip="Добавить блок" aria-label="Добавить блок" onClick={() => editor.chain().focus().insertContent('/').run()}>+</button>
          <button
            data-tooltip="Переместить блок"
            aria-label="Переместить блок"
            draggable
            onDragStart={(event) => {
              setDragPosition(handle.position)
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', handle.position.toString())
              const preview = handle.block.cloneNode(true)
              if (preview instanceof HTMLElement) {
                preview.classList.add('block-drag-preview')
                document.body.append(preview)
                event.dataTransfer.setDragImage(preview, 16, 16)
                requestAnimationFrame(() => preview.remove())
              }
            }}
            onDragEnd={() => { setDragPosition(null); clearDropTarget() }}
          >⠿</button>
        </div>
      )}
    </div>
  )
}
