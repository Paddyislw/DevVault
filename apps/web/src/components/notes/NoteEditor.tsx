'use client'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/trpc'
import type { RouterOutputs } from '@/lib/trpc'
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  TextQuote,
  Code2,
  Minus,
  Table,
  Trash2,
  Plus,
  AlertTriangle,
} from 'lucide-react'
import {
  type Block,
  type BlockType,
  makeBlock,
  markdownToBlocks,
  blocksToMarkdown,
} from './blocks'

type Note = RouterOutputs['notes']['list'][number]

interface Props {
  /** undefined → create a new draft; nothing persists until Save */
  note?: Note
  onSaved: (id: string) => void
  onCancel: () => void
}

// ─── Slash menu ───────────────────────────────────────────────────────────────

const SLASH_OPTIONS: {
  type: BlockType
  label: string
  hint: string
  keywords: string
  icon: typeof Type
}[] = [
  { type: 'p', label: 'Text', hint: 'Plain paragraph', keywords: 'text paragraph plain', icon: Type },
  { type: 'h1', label: 'Heading 1', hint: 'Large section heading', keywords: 'heading1 h1 title', icon: Heading1 },
  { type: 'h2', label: 'Heading 2', hint: 'Medium section heading', keywords: 'heading2 h2 subtitle', icon: Heading2 },
  { type: 'h3', label: 'Heading 3', hint: 'Small section heading', keywords: 'heading3 h3', icon: Heading3 },
  { type: 'bullet', label: 'Bulleted list', hint: 'Simple bullet points', keywords: 'bullet list ul', icon: List },
  { type: 'numbered', label: 'Numbered list', hint: 'Ordered list', keywords: 'numbered ordered ol list', icon: ListOrdered },
  { type: 'quote', label: 'Quote', hint: 'Callout or citation', keywords: 'quote blockquote callout', icon: TextQuote },
  { type: 'code', label: 'Code snippet', hint: 'Monospace code block', keywords: 'code snippet pre fence', icon: Code2 },
  { type: 'table', label: 'Table', hint: 'Rows and columns', keywords: 'table grid rows columns', icon: Table },
  { type: 'divider', label: 'Divider', hint: 'Horizontal rule', keywords: 'divider rule hr line separator', icon: Minus },
]

// Typing these at the start of an empty paragraph converts it (Notion-style)
const TYPE_SHORTCUTS: [RegExp, BlockType][] = [
  [/^# $/, 'h1'],
  [/^## $/, 'h2'],
  [/^### $/, 'h3'],
  [/^[-*] $/, 'bullet'],
  [/^1[.)] $/, 'numbered'],
  [/^> $/, 'quote'],
  [/^```$/, 'code'],
]

const isTextBlock = (t: BlockType) =>
  t === 'p' || t === 'h1' || t === 'h2' || t === 'h3' || t === 'bullet' || t === 'numbered' || t === 'quote'

type Field = HTMLTextAreaElement | HTMLInputElement

export function NoteEditor({ note, onSaved, onCancel }: Props) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [blocks, setBlocks] = useState<Block[]>(() =>
    note ? markdownToBlocks(note.content ?? '') : [makeBlock('p')],
  )
  const [slashFor, setSlashFor] = useState<string | null>(null)
  const [slashIndex, setSlashIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fieldRefs = useRef(new Map<string, Field>())
  const pendingFocus = useRef<{ id: string; pos: number | 'end' } | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  const utils = api.useUtils()
  const { data: workspaces } = api.workspaces.list.useQuery()

  const createNote = api.notes.create.useMutation({
    onSuccess: (n) => { utils.notes.list.invalidate(); onSaved(n.id) },
    onError: (e) => setError(e.message),
  })
  const updateNote = api.notes.update.useMutation({
    onSuccess: (n) => { utils.notes.list.invalidate(); onSaved(n.id) },
    onError: (e) => setError(e.message),
  })
  const isSaving = createNote.isPending || updateNote.isPending

  // ── Focus management ──
  useEffect(() => {
    if (!note) titleRef.current?.focus()
  }, [note])

  useEffect(() => {
    const target = pendingFocus.current
    if (!target) return
    pendingFocus.current = null
    const el = fieldRefs.current.get(target.id)
    if (!el) return
    el.focus()
    const pos = target.pos === 'end' ? el.value.length : target.pos
    try { el.setSelectionRange(pos, pos) } catch { /* number inputs etc. */ }
  }, [blocks])

  function focusBlock(id: string, pos: number | 'end') {
    pendingFocus.current = { id, pos }
    // Trigger the effect even if blocks didn't change
    setBlocks(b => [...b])
  }

  // ── Block operations ──
  function patchBlock(id: string, patch: Partial<Block>) {
    setBlocks(bs => bs.map(b => (b.id === id ? { ...b, ...patch } : b)))
  }

  function insertAfter(id: string, block: Block, focus = true) {
    setBlocks(bs => {
      const i = bs.findIndex(b => b.id === id)
      return [...bs.slice(0, i + 1), block, ...bs.slice(i + 1)]
    })
    if (focus) pendingFocus.current = { id: block.id, pos: 0 }
  }

  function removeBlock(id: string) {
    setBlocks(bs => {
      const i = bs.findIndex(b => b.id === id)
      const next = bs.filter(b => b.id !== id)
      const prev = next[Math.max(0, i - 1)]
      if (prev && isTextBlock(prev.type)) pendingFocus.current = { id: prev.id, pos: 'end' }
      return next.length ? next : [makeBlock('p')]
    })
  }

  // ── Text change: slash menu + markdown shortcuts ──
  function handleTextChange(block: Block, text: string) {
    if (block.type === 'p') {
      for (const [re, type] of TYPE_SHORTCUTS) {
        if (re.test(text)) {
          patchBlock(block.id, { type, text: '' })
          setSlashFor(null)
          return
        }
      }
    }
    patchBlock(block.id, { text })
    if (block.type === 'p' && text.startsWith('/')) {
      if (slashFor !== block.id) { setSlashFor(block.id); setSlashIndex(0) }
    } else if (slashFor === block.id) {
      setSlashFor(null)
    }
  }

  function slashOptions(block: Block) {
    const q = block.text.slice(1).toLowerCase().trim()
    return SLASH_OPTIONS.filter(o => !q || o.label.toLowerCase().includes(q) || o.keywords.includes(q))
  }

  function applySlash(block: Block, type: BlockType) {
    setSlashFor(null)
    if (type === 'divider') {
      const para = makeBlock('p')
      setBlocks(bs => {
        const i = bs.findIndex(b => b.id === block.id)
        const divider = makeBlock('divider')
        return [...bs.slice(0, i), divider, para, ...bs.slice(i + 1)]
      })
      pendingFocus.current = { id: para.id, pos: 0 }
      return
    }
    if (type === 'table') {
      setBlocks(bs => bs.map(b => (b.id === block.id ? { ...makeBlock('table'), id: b.id } : b)))
      return
    }
    patchBlock(block.id, { type, text: '' })
    focusBlock(block.id, 0)
  }

  // ── Keyboard handling for text blocks ──
  function handleKeyDown(e: React.KeyboardEvent<Field>, block: Block, index: number) {
    // Slash menu navigation
    if (slashFor === block.id) {
      const options = slashOptions(block)
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIndex(i => (i + 1) % Math.max(options.length, 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIndex(i => (i - 1 + options.length) % Math.max(options.length, 1)); return }
      if (e.key === 'Enter') { e.preventDefault(); if (options[slashIndex]) applySlash(block, options[slashIndex].type); return }
      if (e.key === 'Escape') { e.preventDefault(); setSlashFor(null); return }
    }

    const el = e.currentTarget
    const caret = el.selectionStart ?? 0
    const caretEnd = el.selectionEnd ?? 0
    const atStart = caret === 0 && caretEnd === 0

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // Empty list item → back to paragraph
      if ((block.type === 'bullet' || block.type === 'numbered') && !block.text) {
        patchBlock(block.id, { type: 'p' })
        focusBlock(block.id, 0)
        return
      }
      const before = block.text.slice(0, caret)
      const after = block.text.slice(caret)
      const nextType: BlockType =
        block.type === 'bullet' || block.type === 'numbered' ? block.type : 'p'
      patchBlock(block.id, { text: before })
      insertAfter(block.id, makeBlock(nextType, after))
      return
    }

    if (e.key === 'Backspace' && atStart) {
      if (block.type !== 'p') {
        e.preventDefault()
        patchBlock(block.id, { type: 'p' })
        focusBlock(block.id, 0)
        return
      }
      if (!block.text && blocks.length > 1) {
        e.preventDefault()
        removeBlock(block.id)
        return
      }
    }

    // Light up/down navigation between blocks
    if (e.key === 'ArrowUp' && atStart && index > 0) {
      const prev = blocks[index - 1]
      if (isTextBlock(prev.type)) { e.preventDefault(); focusBlock(prev.id, 'end') }
    }
    if (e.key === 'ArrowDown' && caret === el.value.length && index < blocks.length - 1) {
      const next = blocks[index + 1]
      if (isTextBlock(next.type)) { e.preventDefault(); focusBlock(next.id, 'end') }
    }
  }

  // ── Save ──
  function handleSave() {
    setError(null)
    const content = blocksToMarkdown(blocks)
    const finalTitle = title.trim() || 'Untitled'
    if (note) {
      updateNote.mutate({ id: note.id, title: finalTitle, content })
    } else {
      const ws = workspaces?.find(w => w.isDefault) ?? workspaces?.[0]
      if (!ws) { setError('No workspace found — create one in Settings first.'); return }
      createNote.mutate({ workspaceId: ws.id, title: finalTitle, content, type: 'NOTE' })
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  // ── Render helpers ──
  const registerField = (id: string) => (el: Field | null) => {
    if (el) {
      fieldRefs.current.set(id, el)
      if (el instanceof HTMLTextAreaElement) autoresize(el)
    } else {
      fieldRefs.current.delete(id)
    }
  }

  let numberedIndex = 0

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-0">
      {/* ── Editor toolbar ── */}
      <div className="flex items-center justify-between px-8 py-3 border-b border-border-subtle bg-surface-1 flex-shrink-0">
        <span className="text-[12px] text-text-tertiary">
          {note ? 'Editing note' : 'New note — not saved yet'}
          <span className="ml-2 text-text-ghost">
            Type <kbd className="kbd">/</kbd> for blocks
          </span>
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 text-sm bg-accent text-white rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-8 py-2 bg-red-50 border-b border-red-100 flex-shrink-0">
          <AlertTriangle size={12} strokeWidth={1.5} className="text-red-500 flex-shrink-0" />
          <span className="text-[12px] text-red-600">{error}</span>
        </div>
      )}

      {/* ── Document ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] px-8 py-6">
          <input
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (blocks[0] && isTextBlock(blocks[0].type)) focusBlock(blocks[0].id, 0)
              }
            }}
            placeholder="Untitled"
            className="w-full bg-transparent font-display text-[28px] leading-tight text-text-primary placeholder:text-text-ghost outline-none mb-4"
          />

          <div className="flex flex-col">
            {blocks.map((block, index) => {
              if (block.type === 'numbered') numberedIndex += 1
              else numberedIndex = 0

              return (
                <div key={block.id} className="group/block relative">
                  {renderBlock(block, index, numberedIndex)}
                  {slashFor === block.id && (
                    <SlashMenu
                      options={slashOptions(block)}
                      selectedIndex={slashIndex}
                      onHover={setSlashIndex}
                      onSelect={type => applySlash(block, type)}
                    />
                  )}
                </div>
              )
            })}
          </div>

          <button
            onClick={() => {
              const b = makeBlock('p')
              setBlocks(bs => [...bs, b])
              pendingFocus.current = { id: b.id, pos: 0 }
              setBlocks(bs => [...bs])
            }}
            className="flex items-center gap-1.5 mt-3 px-1 py-1 text-[12px] text-text-ghost hover:text-text-secondary transition-colors"
          >
            <Plus size={12} strokeWidth={1.5} />
            Add block
          </button>
        </div>
      </div>
    </div>
  )

  // ── Per-block rendering ──
  function renderBlock(block: Block, index: number, num: number) {
    const baseText =
      'w-full bg-transparent outline-none placeholder:text-text-ghost resize-none'

    switch (block.type) {
      case 'h1':
      case 'h2':
      case 'h3': {
        const cls =
          block.type === 'h1'
            ? 'text-[22px] font-semibold mt-3'
            : block.type === 'h2'
              ? 'text-[18px] font-semibold mt-2.5'
              : 'text-[15px] font-semibold mt-2'
        return (
          <input
            ref={registerField(block.id)}
            value={block.text}
            onChange={e => handleTextChange(block, e.target.value)}
            onKeyDown={e => handleKeyDown(e, block, index)}
            placeholder={`Heading ${block.type.slice(1)}`}
            className={`${baseText} ${cls} text-text-primary py-1`}
          />
        )
      }

      case 'bullet':
      case 'numbered':
        return (
          <div className="flex items-start gap-2 py-0.5">
            <span className="text-[13.5px] text-text-tertiary leading-relaxed pt-[3px] w-4 text-right flex-shrink-0 select-none">
              {block.type === 'bullet' ? '•' : `${num}.`}
            </span>
            <textarea
              ref={registerField(block.id)}
              rows={1}
              value={block.text}
              onChange={e => { handleTextChange(block, e.target.value); autoresize(e.target) }}
              onKeyDown={e => handleKeyDown(e, block, index)}
              placeholder="List item"
              className={`${baseText} text-[13.5px] text-text-primary leading-relaxed pt-[3px]`}
            />
          </div>
        )

      case 'quote':
        return (
          <div className="border-l-2 border-border-strong pl-3 my-1">
            <textarea
              ref={registerField(block.id)}
              rows={1}
              value={block.text}
              onChange={e => { handleTextChange(block, e.target.value); autoresize(e.target) }}
              onKeyDown={e => handleKeyDown(e, block, index)}
              placeholder="Quote"
              className={`${baseText} text-[13.5px] text-text-tertiary italic leading-relaxed py-0.5`}
            />
          </div>
        )

      case 'code':
        return (
          <div className="relative my-1.5">
            <textarea
              ref={registerField(block.id)}
              rows={1}
              value={block.text}
              onChange={e => { patchBlock(block.id, { text: e.target.value }); autoresize(e.target) }}
              onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault()
                  insertAfter(block.id, makeBlock('p'))
                  return
                }
                if (e.key === 'Tab') {
                  e.preventDefault()
                  const el = e.currentTarget
                  const start = el.selectionStart ?? 0
                  const text = block.text.slice(0, start) + '  ' + block.text.slice(el.selectionEnd ?? start)
                  patchBlock(block.id, { text })
                  pendingFocus.current = { id: block.id, pos: start + 2 }
                  setBlocks(bs => [...bs])
                }
                if (e.key === 'Backspace' && !block.text) {
                  e.preventDefault()
                  removeBlock(block.id)
                }
              }}
              placeholder="Code — ⌘↵ to exit"
              className={`${baseText} font-mono text-[12.5px] text-text-primary leading-relaxed bg-surface-1 border border-border-default rounded-md p-3`}
            />
            <BlockDelete onClick={() => removeBlock(block.id)} />
          </div>
        )

      case 'divider':
        return (
          <div className="relative py-2">
            <hr className="border-border-default" />
            <BlockDelete onClick={() => removeBlock(block.id)} />
          </div>
        )

      case 'table':
        return (
          <TableBlock
            block={block}
            onChange={patch => patchBlock(block.id, patch)}
            onDelete={() => removeBlock(block.id)}
          />
        )

      default: // paragraph
        return (
          <textarea
            ref={registerField(block.id)}
            rows={1}
            value={block.text}
            onChange={e => { handleTextChange(block, e.target.value); autoresize(e.target) }}
            onKeyDown={e => handleKeyDown(e, block, index)}
            placeholder={index === 0 && blocks.length === 1 ? "Write something, or type '/' for blocks…" : ''}
            className={`${baseText} text-[13.5px] text-text-primary leading-relaxed py-1`}
          />
        )
    }
  }
}

// ─── Small pieces ─────────────────────────────────────────────────────────────

function autoresize(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function BlockDelete({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Delete block"
      className="absolute -right-7 top-1/2 -translate-y-1/2 p-1 rounded text-text-ghost opacity-0 group-hover/block:opacity-100 hover:text-red-500 hover:bg-surface-2 transition-all"
    >
      <Trash2 size={12} strokeWidth={1.5} />
    </button>
  )
}

function SlashMenu({
  options,
  selectedIndex,
  onHover,
  onSelect,
}: {
  options: typeof SLASH_OPTIONS
  selectedIndex: number
  onHover: (i: number) => void
  onSelect: (type: BlockType) => void
}) {
  if (!options.length) return null
  return (
    <div className="absolute left-0 top-full z-30 mt-1 w-72 bg-surface-1 border border-border-default rounded-md shadow-xl p-1 max-h-72 overflow-y-auto">
      {options.map((opt, i) => {
        const Icon = opt.icon
        return (
          <button
            key={opt.type}
            onMouseEnter={() => onHover(i)}
            // onMouseDown so the textarea doesn't blur before we handle it
            onMouseDown={e => { e.preventDefault(); onSelect(opt.type) }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-left transition-colors ${
              i === selectedIndex ? 'bg-surface-2' : ''
            }`}
          >
            <span className="w-7 h-7 rounded-md border border-border-subtle bg-surface-0 flex items-center justify-center flex-shrink-0">
              <Icon size={13} strokeWidth={1.5} className="text-text-secondary" />
            </span>
            <span className="flex flex-col min-w-0">
              <span className="text-[12.5px] text-text-primary font-medium">{opt.label}</span>
              <span className="text-[11px] text-text-tertiary truncate">{opt.hint}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function TableBlock({
  block,
  onChange,
  onDelete,
}: {
  block: Block
  onChange: (patch: Partial<Block>) => void
  onDelete: () => void
}) {
  const header = block.header ?? ['', '']
  const rows = block.rows ?? [['', '']]

  const cellClass =
    'w-full bg-transparent outline-none text-[12.5px] px-2.5 py-1.5 min-w-[90px]'

  const setHeader = (i: number, v: string) =>
    onChange({ header: header.map((c, j) => (j === i ? v : c)) })
  const setCell = (r: number, c: number, v: string) =>
    onChange({ rows: rows.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? v : cell)) : row)) })
  const addRow = () => onChange({ rows: [...rows, header.map(() => '')] })
  const removeRow = (r: number) =>
    rows.length > 1 && onChange({ rows: rows.filter((_, i) => i !== r) })
  const addCol = () =>
    onChange({ header: [...header, ''], rows: rows.map(r => [...r, '']) })
  const removeCol = () =>
    header.length > 1 &&
    onChange({ header: header.slice(0, -1), rows: rows.map(r => r.slice(0, -1)) })

  return (
    <div className="relative my-2">
      <div className="overflow-x-auto border border-border-default rounded-md bg-surface-1">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-2">
              {header.map((cell, i) => (
                <th key={i} className="border-b border-border-default p-0">
                  <input
                    value={cell}
                    onChange={e => setHeader(i, e.target.value)}
                    placeholder={`Column ${i + 1}`}
                    className={`${cellClass} font-medium text-text-primary placeholder:text-text-ghost`}
                  />
                </th>
              ))}
              <th className="w-7 bg-surface-2 border-b border-border-default" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="group/row border-b border-border-subtle last:border-b-0">
                {row.map((cell, c) => (
                  <td key={c} className="p-0 align-top">
                    <input
                      value={cell}
                      onChange={e => setCell(r, c, e.target.value)}
                      className={`${cellClass} text-text-secondary`}
                    />
                  </td>
                ))}
                <td className="w-7 text-center align-middle">
                  <button
                    onClick={() => removeRow(r)}
                    title="Delete row"
                    className="p-0.5 text-text-ghost opacity-0 group-hover/row:opacity-100 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={11} strokeWidth={1.5} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        <TableAction label="+ Row" onClick={addRow} />
        <TableAction label="+ Column" onClick={addCol} />
        <TableAction label="– Column" onClick={removeCol} />
        <TableAction label="Delete table" onClick={onDelete} danger />
      </div>
    </div>
  )
}

function TableAction({
  label,
  onClick,
  danger,
}: {
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 text-[11px] rounded border border-border-subtle transition-colors ${
        danger
          ? 'text-text-ghost hover:text-red-500 hover:border-red-200'
          : 'text-text-tertiary hover:text-text-primary hover:border-border-default'
      }`}
    >
      {label}
    </button>
  )
}
