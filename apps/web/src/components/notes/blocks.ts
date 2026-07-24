// Block model for the Notion-style note editor.
// Notes are STORED as markdown (Note.content) so search, the Telegram bot,
// Beautify with AI, and existing notes all keep working — blocks are only
// the in-memory editing representation.

export type BlockType =
  | 'p'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bullet'
  | 'numbered'
  | 'quote'
  | 'code'
  | 'divider'
  | 'table'

export interface Block {
  id: string
  type: BlockType
  text: string // p / h* / bullet / numbered / quote / code (code is multiline)
  lang?: string // code fence language, preserved on round-trip
  header?: string[] // table
  rows?: string[][] // table
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function makeBlock(type: BlockType = 'p', text = ''): Block {
  if (type === 'table') {
    return { id: uid(), type, text: '', header: ['', ''], rows: [['', '']] }
  }
  return { id: uid(), type, text }
}

const isListType = (t: BlockType) => t === 'bullet' || t === 'numbered'

// ─── Markdown → Blocks ────────────────────────────────────────────────────────

const isTableRow = (line: string) => /^\s*\|.*\|\s*$/.test(line)
const isSeparatorRow = (line: string) => /^[\s|:-]+$/.test(line) && line.includes('-')
const parseCells = (line: string) =>
  line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())

export function markdownToBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let para: string[] = []
  let inCode = false
  let codeLang = ''
  let codeLines: string[] = []
  let tableLines: string[] = []

  const flushPara = () => {
    if (para.length) {
      blocks.push(makeBlock('p', para.join(' ')))
      para = []
    }
  }
  const flushTable = () => {
    if (!tableLines.length) return
    const rows = tableLines
    tableLines = []
    const hasHeader = rows.length >= 2 && isSeparatorRow(rows[1])
    const header = hasHeader ? parseCells(rows[0]) : null
    const body = (hasHeader ? rows.slice(2) : rows).filter(r => !isSeparatorRow(r)).map(parseCells)
    const cols = Math.max(header?.length ?? 0, ...body.map(r => r.length), 1)
    const pad = (r: string[]) => [...r, ...Array(Math.max(0, cols - r.length)).fill('')]
    blocks.push({
      id: uid(),
      type: 'table',
      text: '',
      header: pad(header ?? Array(cols).fill('')),
      rows: body.length ? body.map(pad) : [Array(cols).fill('')],
    })
  }

  for (const line of lines) {
    const fence = line.trim().match(/^```(\S*)\s*$/)
    if (fence) {
      flushPara(); flushTable()
      if (inCode) {
        blocks.push({ id: uid(), type: 'code', text: codeLines.join('\n'), lang: codeLang || undefined })
        codeLines = []
        inCode = false
      } else {
        inCode = true
        codeLang = fence[1] ?? ''
      }
      continue
    }
    if (inCode) { codeLines.push(line); continue }

    if (isTableRow(line)) { flushPara(); tableLines.push(line); continue }
    flushTable()

    const heading = line.match(/^(#{1,3}) (.+)$/)
    if (heading) {
      flushPara()
      const type = (['h1', 'h2', 'h3'] as const)[heading[1].length - 1]
      blocks.push(makeBlock(type, heading[2]))
      continue
    }
    if (/^(---+|\*\*\*+)\s*$/.test(line.trim())) { flushPara(); blocks.push(makeBlock('divider')); continue }

    const bullet = line.match(/^\s*[-*] (.+)$/)
    if (bullet) { flushPara(); blocks.push(makeBlock('bullet', bullet[1])); continue }

    const numbered = line.match(/^\s*\d+[.)] (.+)$/)
    if (numbered) { flushPara(); blocks.push(makeBlock('numbered', numbered[1])); continue }

    const quote = line.match(/^> ?(.*)$/)
    if (quote) { flushPara(); blocks.push(makeBlock('quote', quote[1])); continue }

    if (!line.trim()) { flushPara(); continue }
    para.push(line.trim())
  }

  flushPara()
  flushTable()
  if (inCode) blocks.push({ id: uid(), type: 'code', text: codeLines.join('\n'), lang: codeLang || undefined })

  return blocks.length ? blocks : [makeBlock('p')]
}

// ─── Blocks → Markdown ────────────────────────────────────────────────────────

export function blocksToMarkdown(blocks: Block[]): string {
  const out: string[] = []
  let numberedIndex = 0

  blocks.forEach((block, i) => {
    if (block.type === 'numbered') numberedIndex += 1
    else numberedIndex = 0

    switch (block.type) {
      case 'h1': out.push(`# ${block.text}`); break
      case 'h2': out.push(`## ${block.text}`); break
      case 'h3': out.push(`### ${block.text}`); break
      case 'bullet': out.push(`- ${block.text}`); break
      case 'numbered': out.push(`${numberedIndex}. ${block.text}`); break
      case 'quote': out.push(`> ${block.text}`); break
      case 'divider': out.push('---'); break
      case 'code':
        out.push('```' + (block.lang ?? ''), block.text, '```')
        break
      case 'table': {
        const header = block.header ?? []
        const rows = block.rows ?? []
        out.push(`| ${header.join(' | ')} |`)
        out.push(`|${header.map(() => '------').join('|')}|`)
        for (const row of rows) out.push(`| ${row.join(' | ')} |`)
        break
      }
      default: {
        // Skip fully empty trailing paragraphs so saves don't accumulate blanks
        if (block.text.trim() || blocks.some((b, j) => j > i && b.text.trim())) {
          out.push(block.text)
        }
      }
    }

    // Blank line between blocks — except between consecutive list items of the
    // same type, which must stay adjacent to parse back as one list
    const next = blocks[i + 1]
    if (next && !(isListType(block.type) && next.type === block.type)) {
      out.push('')
    }
  })

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
