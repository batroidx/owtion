import type { JsonNode } from '../../shared/types'

function inline(node: JsonNode): string {
  if (node.type === 'text') {
    let value = node.text ?? ''
    for (const mark of node.marks ?? []) {
      if (mark.type === 'bold') value = `**${value}**`
      if (mark.type === 'italic') value = `_${value}_`
      if (mark.type === 'strike') value = `~~${value}~~`
      if (mark.type === 'code') value = `\`${value}\``
      if (mark.type === 'link') value = `[${value}](${mark.attrs?.href ?? ''})`
    }
    return value
  }
  return (node.content ?? []).map(inline).join('')
}

function block(node: JsonNode, depth = 0): string {
  const children = node.content ?? []
  const inner = children.map((child) => block(child, depth)).join('\n')
  switch (node.type) {
    case 'heading': return `${'#'.repeat(Number(node.attrs?.level ?? 1))} ${inline(node)}`
    case 'paragraph': return inline(node)
    case 'bulletList': return children.map((item) => `${'  '.repeat(depth)}- ${block(item, depth + 1).replace(/\n/g, '\n  ')}`).join('\n')
    case 'orderedList': return children.map((item, index) => `${'  '.repeat(depth)}${index + 1}. ${block(item, depth + 1)}`).join('\n')
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
    case 'toggle': return `<details>\n<summary>Скрытый блок</summary>\n\n${inner}\n\n</details>`
    case 'callout': return `> **${String(node.attrs?.kind ?? 'info').toUpperCase()}**\n> ${inner.replace(/\n/g, '\n> ')}`
    case 'doc': return inner
    default: return inline(node) || inner
  }
}

export function exportMarkdown(title: string, content: JsonNode): string {
  return `# ${title}\n\n${(content.content ?? []).map((node) => block(node)).filter(Boolean).join('\n\n')}\n`
}

export function importMarkdown(markdown: string): JsonNode {
  const content: JsonNode[] = []
  for (const line of markdown.replace(/\r/g, '').split('\n')) {
    if (!line.trim()) continue
    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    const bullet = /^[-*]\s+(.*)$/.exec(line)
    const ordered = /^\d+\.\s+(.*)$/.exec(line)
    const quote = /^>\s?(.*)$/.exec(line)
    if (heading) content.push({ type: 'heading', attrs: { level: heading[1].length }, content: [{ type: 'text', text: heading[2] }] })
    else if (bullet) content.push({ type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: bullet[1] }] }] }] })
    else if (ordered) content.push({ type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: ordered[1] }] }] }] })
    else if (quote) content.push({ type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: quote[1] }] }] })
    else content.push({ type: 'paragraph', content: [{ type: 'text', text: line }] })
  }
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character] ?? character)
}

function html(node: JsonNode): string {
  const children = (node.content ?? []).map(html).join('')
  switch (node.type) {
    case 'text': {
      let value = escapeHtml(node.text ?? '')
      for (const mark of node.marks ?? []) {
        if (mark.type === 'bold') value = `<strong>${value}</strong>`
        if (mark.type === 'italic') value = `<em>${value}</em>`
        if (mark.type === 'strike') value = `<s>${value}</s>`
        if (mark.type === 'code') value = `<code>${value}</code>`
        if (mark.type === 'underline') value = `<u>${value}</u>`
        if (mark.type === 'link') value = `<a href="${escapeHtml(mark.attrs?.href ?? '')}">${value}</a>`
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
    case 'toggle': return `<details><summary>Скрытый блок</summary>${children}</details>`
    case 'callout': return `<aside class="callout ${escapeHtml(String(node.attrs?.kind ?? 'info'))}">${children}</aside>`
    default: return children
  }
}

export function exportHtml(title: string, content: JsonNode): string {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px}pre,aside{padding:12px;background:#f5f5f7;border-radius:6px}blockquote{border-left:3px solid #ddd;padding-left:14px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:7px}</style></head><body><h1>${escapeHtml(title)}</h1>${html(content)}</body></html>`
}
