import type { JsonNode } from '../../shared/types'
import type { Language } from './i18n'
import { lexer, type Token, type Tokens } from 'marked'

function inline(node: JsonNode): string {
  if (node.type === 'text') {
    let value = node.text ?? ''
    for (const mark of node.marks ?? []) {
      if (mark.type === 'bold') value = `**${value}**`
      if (mark.type === 'italic') value = `_${value}_`
      if (mark.type === 'strike') value = `~~${value}~~`
      if (mark.type === 'code') value = `\`${value}\``
      if (mark.type === 'link') value = `[${value}](${mark.attrs?.href ?? ''}${mark.attrs?.title ? ` "${mark.attrs.title}"` : ''})`
      if (mark.type === 'wikiLink') value = `[[${mark.attrs?.groupName ?? ''}:${mark.attrs?.pageTitle ?? value}]]`
      if (mark.type === 'underline') value = `<u>${value}</u>`
    }
    return value
  }
  return (node.content ?? []).map(inline).join('')
}

function block(node: JsonNode, depth = 0, toggleLabel = 'Hidden block'): string {
  const children = node.content ?? []
  const inner = children.map((child) => block(child, depth, toggleLabel)).join('\n')
  switch (node.type) {
    case 'heading': return `${'#'.repeat(Number(node.attrs?.level ?? 1))} ${inline(node)}`
    case 'paragraph': return inline(node)
    case 'bulletList': return children.map((item) => `${'  '.repeat(depth)}- ${block(item, depth + 1).replace(/\n/g, '\n  ')}`).join('\n')
    case 'orderedList': return children.map((item, index) => `${'  '.repeat(depth)}${Number(node.attrs?.start ?? 1) + index}. ${block(item, depth + 1)}`).join('\n')
    case 'taskList': return children.map((item) => `${'  '.repeat(depth)}- [${item.attrs?.checked ? 'x' : ' '}] ${block(item, depth + 1)}`).join('\n')
    case 'listItem':
    case 'taskItem': return children.map((child) => block(child, depth)).join('\n')
    case 'blockquote': return inner.split('\n').map((line) => `> ${line}`).join('\n')
    case 'codeBlock': return `\`\`\`${String(node.attrs?.language ?? '')}\n${children.map((child) => child.text ?? '').join('')}\n\`\`\``
    case 'horizontalRule': return '---'
    case 'image': return `![${String(node.attrs?.alt ?? '')}](${String(node.attrs?.src ?? '')})`
    case 'embed': return `[${String(node.attrs?.title ?? node.attrs?.url ?? '')}](${String(node.attrs?.url ?? '')})`
    case 'table': return children.map((row, rowIndex) => {
      const cells = row.content ?? []
      const line = `| ${cells.map((cell) => (cell.content ?? []).map(inline).join('')).join(' | ')} |`
      return rowIndex === 0 ? `${line}\n| ${cells.map(() => '---').join(' | ')} |` : line
    }).join('\n')
    case 'toggle': return `<details>\n<summary>${toggleLabel}</summary>\n\n${inner}\n\n</details>`
    case 'callout': return `> **${String(node.attrs?.kind ?? 'info').toUpperCase()}**\n> ${inner.replace(/\n/g, '\n> ')}`
    case 'doc': return inner
    default: return inline(node) || inner
  }
}

export function exportMarkdown(title: string, content: JsonNode, language: Language = 'ru'): string {
  const toggleLabel = language === 'ru' ? 'Скрытый блок' : 'Hidden block'
  return `# ${title}\n\n${(content.content ?? []).map((node) => block(node, 0, toggleLabel)).filter(Boolean).join('\n\n')}\n`
}

export function importMarkdown(markdown: string): JsonNode {
  const collapseToggleBlocks = (tokens: Token[]): Token[] => {
    const output: Token[] = []
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index]
      if (token.type !== 'html' || !/^<details\b/i.test((token as Tokens.HTML).text.trim())) {
        output.push(token)
        continue
      }
      const closingIndex = tokens.findIndex((candidate, candidateIndex) => candidateIndex > index
        && candidate.type === 'html'
        && /<\/details\s*>/i.test((candidate as Tokens.HTML).text))
      if (closingIndex < 0) {
        output.push(token)
        continue
      }
      const raw = tokens.slice(index, closingIndex + 1).map((part) => part.raw).join('')
      const match = /^<details\b[^>]*>\s*<summary\b[^>]*>[\s\S]*?<\/summary>([\s\S]*?)<\/details\s*>\s*$/i.exec(raw)
      if (!match) {
        output.push(token)
        continue
      }
      output.push({ type: 'owtionToggle', raw, text: match[1], tokens: collapseToggleBlocks(lexer(match[1])) })
      index = closingIndex
    }
    return output
  }

  const parseInline = (tokens: Token[], marks: NonNullable<JsonNode['marks']> = []): JsonNode[] => {
    const output: JsonNode[] = []
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index]
      if (token.type === 'html') {
        const html = (token as Tokens.HTML).text
        const opening = /^<(u|strong|b|em|i|s|del|code)\s*>$/i.exec(html)
        const htmlLink = /^<a\b[^>]*href=(["'])(.*?)\1[^>]*>$/i.exec(html)
        if (opening || htmlLink) {
          const tag = opening?.[1].toLowerCase() ?? 'a'
          const closingIndex = tokens.findIndex((candidate, candidateIndex) => candidateIndex > index
            && candidate.type === 'html'
            && (candidate as Tokens.HTML).text.toLowerCase() === `</${tag}>`)
          if (closingIndex > index) {
            const markType = htmlLink ? 'link'
              : tag === 'u' ? 'underline'
              : tag === 'strong' || tag === 'b' ? 'bold'
                : tag === 'em' || tag === 'i' ? 'italic'
                  : tag === 's' || tag === 'del' ? 'strike' : 'code'
            const attrs = htmlLink ? { href: htmlLink[2] } : undefined
            output.push(...parseInline(tokens.slice(index + 1, closingIndex), [...marks, { type: markType, ...(attrs ? { attrs } : {}) }]))
            index = closingIndex
            continue
          }
        }
      }
      if (token.type === 'strong' || token.type === 'em' || token.type === 'del' || token.type === 'link') {
      let mark: { type: string; attrs?: Record<string, string> } = token.type === 'strong'
        ? { type: 'bold' }
        : token.type === 'em'
          ? { type: 'italic' }
          : token.type === 'del'
            ? { type: 'strike' }
            : { type: 'link', attrs: { href: (token as Tokens.Link).href } }
      if (token.type === 'link' && (token as Tokens.Link).title) {
        const link = token as Tokens.Link
        mark = { type: 'link', attrs: { href: link.href, title: link.title ?? '' } }
      }
        output.push(...parseInline((token as Tokens.Strong | Tokens.Em | Tokens.Del | Tokens.Link).tokens, [...marks, mark]))
        continue
      }
      if (token.type === 'codespan') {
        output.push({ type: 'text', text: (token as Tokens.Codespan).text, marks: [...marks, { type: 'code' }] })
        continue
      }
      if (token.type === 'image') {
        const image = token as Tokens.Image
        output.push({ type: 'image', attrs: { src: image.href, alt: image.text, title: image.title } })
        continue
      }
      if (token.type === 'br') {
        output.push({ type: 'hardBreak' })
        continue
      }
      if (token.type === 'text' || token.type === 'escape' || token.type === 'html') {
        const textToken = token as Tokens.Text | Tokens.Escape | Tokens.HTML
        if ('tokens' in textToken && textToken.tokens) output.push(...parseInline(textToken.tokens, marks))
        else output.push(...wikiAwareText('text' in textToken ? textToken.text : '', marks))
      }
    }
    return output
  }

  const wikiAwareText = (text: string, marks: NonNullable<JsonNode['marks']>): JsonNode[] => {
    const output: JsonNode[] = []
    const expression = /\[\[([^:\]]+):([^\]]+)\]\]/g
    let offset = 0
    for (const match of text.matchAll(expression)) {
      const index = match.index ?? 0
      if (index > offset) output.push({ type: 'text', text: text.slice(offset, index), marks })
      output.push({
        type: 'text',
        text: match[2],
        marks: [...marks, { type: 'wikiLink', attrs: { pageId: '', groupName: match[1], pageTitle: match[2] } }]
      })
      offset = index + match[0].length
    }
    if (offset < text.length) output.push({ type: 'text', text: text.slice(offset), marks })
    return output
  }

  const parseBlocks = (tokens: Token[]): JsonNode[] => tokens.flatMap((token): JsonNode[] => {
    if (token.type === 'space' || token.type === 'def') return []
    if (token.type === 'heading') {
      const heading = token as Tokens.Heading
      return [{ type: 'heading', attrs: { level: heading.depth }, content: parseInline(heading.tokens) }]
    }
    if (token.type === 'paragraph' || token.type === 'text') {
      const paragraph = token as Tokens.Paragraph | Tokens.Text
      const content = 'tokens' in paragraph && paragraph.tokens ? parseInline(paragraph.tokens) : wikiAwareText(paragraph.text, [])
      const output: JsonNode[] = []
      let textContent: JsonNode[] = []
      const flushText = (): void => {
        if (textContent.length) output.push({ type: 'paragraph', content: textContent })
        textContent = []
      }
      content.forEach((child) => {
        if (child.type === 'image') {
          flushText()
          output.push(child)
        } else {
          textContent.push(child)
        }
      })
      flushText()
      if (output.length === 0) output.push({ type: 'paragraph' })
      return output
    }
    if (token.type === 'code') {
      const code = token as Tokens.Code
      return [{ type: 'codeBlock', attrs: { language: code.lang?.split(/\s+/)[0] ?? 'plaintext' }, content: code.text ? [{ type: 'text', text: code.text }] : undefined }]
    }
    if (token.type === 'hr') return [{ type: 'horizontalRule' }]
    if (token.type === 'owtionToggle') return [{ type: 'toggle', content: parseBlocks((token as Tokens.Generic).tokens ?? []) }]
    if (token.type === 'blockquote') {
      const quote = token as Tokens.Blockquote
      const callout = /^>\s*\*\*(INFO|WARNING|SUCCESS|DANGER)\*\*\s*\n([\s\S]*)$/i.exec(quote.raw)
      if (callout) {
        const content = callout[2].replace(/^>\s?/gm, '')
        return [{ type: 'callout', attrs: { kind: callout[1].toLowerCase() }, content: parseBlocks(lexer(content)) }]
      }
      return [{ type: 'blockquote', content: parseBlocks(quote.tokens) }]
    }
    if (token.type === 'list') {
      const list = token as Tokens.List
      const items = list.items.map((item): JsonNode => {
        const children = parseBlocks(item.tokens)
        const paragraph = children[0]?.type === 'paragraph' ? children.shift() : undefined
        const content = paragraph ? [paragraph, ...children] : children.length ? children : [{ type: 'paragraph' }]
        return list.items.some((entry) => entry.task)
          ? { type: 'taskItem', attrs: { checked: Boolean(item.checked) }, content }
          : { type: 'listItem', content }
      })
      return [{
        type: list.items.some((item) => item.task) ? 'taskList' : list.ordered ? 'orderedList' : 'bulletList',
        ...(list.ordered && list.start !== 1 ? { attrs: { start: Number(list.start) } } : {}),
        content: items
      }]
    }
    if (token.type === 'table') {
      const table = token as Tokens.Table
      const row = (cells: Tokens.TableCell[], header: boolean): JsonNode => ({
        type: 'tableRow',
        content: cells.map((cell): JsonNode => ({
          type: header ? 'tableHeader' : 'tableCell',
          content: [{ type: 'paragraph', content: parseInline(cell.tokens) }]
        }))
      })
      return [{ type: 'table', content: [row(table.header, true), ...table.rows.map((cells) => row(cells, false))] }]
    }
    if (token.type === 'html') {
      const raw = (token as Tokens.HTML).text.trim()
      const callout = /^<aside\b[^>]*class=["'][^"']*\bcallout(?:\s+(info|warning|success|danger))?[^"']*["'][^>]*>([\s\S]*?)<\/aside\s*>$/i.exec(raw)
      if (callout) {
        const text = callout[2].replace(/<\/p>\s*<p[^>]*>/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim()
        return [{ type: 'callout', attrs: { kind: (callout[1] ?? 'info').toLowerCase() }, content: [{ type: 'paragraph', content: wikiAwareText(text, []) }] }]
      }
      return raw ? [{ type: 'paragraph', content: [{ type: 'text', text: raw }] }] : []
    }
    return []
  })

  const content = parseBlocks(collapseToggleBlocks(lexer(markdown)))
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character] ?? character)
}

function html(node: JsonNode, toggleLabel: string): string {
  const children = (node.content ?? []).map((child) => html(child, toggleLabel)).join('')
  switch (node.type) {
    case 'text': {
      let value = escapeHtml(node.text ?? '')
      for (const mark of node.marks ?? []) {
        if (mark.type === 'bold') value = `<strong>${value}</strong>`
        if (mark.type === 'italic') value = `<em>${value}</em>`
        if (mark.type === 'strike') value = `<s>${value}</s>`
        if (mark.type === 'code') value = `<code>${value}</code>`
        if (mark.type === 'underline') value = `<u>${value}</u>`
        if (mark.type === 'link') value = `<a href="${escapeHtml(mark.attrs?.href ?? '')}"${mark.attrs?.title ? ` title="${escapeHtml(mark.attrs.title)}"` : ''}>${value}</a>`
        if (mark.type === 'wikiLink') value = `<span data-wiki-link="true" data-page-id="${escapeHtml(mark.attrs?.pageId ?? '')}" data-group-name="${escapeHtml(mark.attrs?.groupName ?? '')}" data-page-title="${escapeHtml(mark.attrs?.pageTitle ?? '')}" class="wiki-link">${value}</span>`
      }
      return value
    }
    case 'doc': return children
    case 'paragraph': return `<p>${children}</p>`
    case 'heading': return `<h${Number(node.attrs?.level ?? 1)}>${children}</h${Number(node.attrs?.level ?? 1)}>`
    case 'bulletList': return `<ul>${children}</ul>`
    case 'orderedList': return `<ol>${children}</ol>`
    case 'listItem': return `<li>${children}</li>`
    case 'taskList': return `<ul>${children}</ul>`
    case 'taskItem': return `<li><input type="checkbox" ${node.attrs?.checked ? 'checked' : ''} disabled>${children}</li>`
    case 'blockquote': return `<blockquote>${children}</blockquote>`
    case 'codeBlock': return `<pre><code>${escapeHtml((node.content ?? []).map((item) => item.text ?? '').join(''))}</code></pre>`
    case 'horizontalRule': return '<hr>'
    case 'image': return `<img src="${escapeHtml(String(node.attrs?.src ?? ''))}" alt="${escapeHtml(String(node.attrs?.alt ?? ''))}">`
    case 'embed': return `<p><a href="${escapeHtml(String(node.attrs?.url ?? ''))}">${escapeHtml(String(node.attrs?.title ?? node.attrs?.url ?? ''))}</a></p>`
    case 'table': return `<table>${children}</table>`
    case 'tableRow': return `<tr>${children}</tr>`
    case 'tableHeader': return `<th>${children}</th>`
    case 'tableCell': return `<td>${children}</td>`
    case 'toggle': return `<details><summary>${escapeHtml(toggleLabel)}</summary>${children}</details>`
    case 'callout': return `<aside class="callout ${escapeHtml(String(node.attrs?.kind ?? 'info'))}">${children}</aside>`
    default: return children
  }
}

export function exportHtml(title: string, content: JsonNode, language: Language = 'ru'): string {
  const toggleLabel = language === 'ru' ? 'Скрытый блок' : 'Hidden block'
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px}pre,aside{padding:12px;background:#f5f5f7;border-radius:6px}blockquote{border-left:3px solid #ddd;padding-left:14px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:7px}</style></head><body><h1>${escapeHtml(title)}</h1>${html(content, toggleLabel)}</body></html>`
}
