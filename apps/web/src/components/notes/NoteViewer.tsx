'use client'
import { useState } from 'react'
import { api } from '@/lib/trpc'
import type { RouterOutputs } from '@/lib/trpc'
import {
  Copy,
  Edit2,
  Trash2,
  Check,
  AlertTriangle,
  Wand2,
  FileText,
  X,
} from 'lucide-react'

type Note = RouterOutputs['notes']['list'][number]

interface Props {
  note: Note | null
  onEdit: (note: Note) => void
}

function formatUpdatedAt(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function NoteViewer({ note, onEdit }: Props) {
  const [copied, setCopied] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  // AI-formatted markdown awaiting Apply/Discard — never saved automatically
  const [preview, setPreview] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [askOpen, setAskOpen] = useState(false)
  const [instruction, setInstruction] = useState('')
  const utils = api.useUtils()

  const deleteNote = api.notes.delete.useMutation({
    onSettled: () => utils.notes.list.invalidate(),
  })
  const incrementCopy = api.notes.incrementCopyCount.useMutation()

  const beautify = api.notes.beautify.useMutation({
    onMutate: () => setAiError(null),
    onSuccess: (res) => {
      setPreview(res.content)
      setAskOpen(false)
      setInstruction('')
    },
    onError: (e) => setAiError(e.message),
  })

  function submitInstruction() {
    if (!note || !instruction.trim() || beautify.isPending) return
    beautify.mutate({ id: note.id, mode: 'custom', instruction: instruction.trim() })
  }

  const applyBeautify = api.notes.update.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate()
      setPreview(null)
    },
    onError: (e) => setAiError(e.message),
  })

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    if (note) incrementCopy.mutate({ id: note.id })
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDelete() {
    if (!note) return
    if (!deleteConfirm) { setDeleteConfirm(true); return }
    deleteNote.mutate({ id: note.id })
    setDeleteConfirm(false)
  }

  if (!note) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-surface-0">
      <FileText size={24} strokeWidth={1} className="text-text-ghost" />
      <p className="text-[13px] text-text-ghost">Select a note to view</p>
    </div>
  )

  const isCommand = note.type === 'COMMAND'
  const displayContent = preview ?? note.content ?? ''

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-0">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 px-8 py-5 border-b border-border-subtle flex-shrink-0 bg-surface-1">
        <div className="flex flex-col gap-2 min-w-0">
          <h2 className="font-display text-[24px] leading-tight text-text-primary truncate">
            {note.title}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-text-tertiary">
              Updated {formatUpdatedAt(note.updatedAt)}
            </span>
            {note.language && (
              <span className="text-[11px] text-text-tertiary bg-surface-2 px-2 py-0.5 rounded">
                {note.language}
              </span>
            )}
            {note.tags?.map(tag => (
              <span
                key={tag}
                className="text-[11px] text-text-tertiary bg-surface-2 px-2 py-0.5 rounded"
              >
                #{tag}
              </span>
            ))}
            {note.source && (
              <span className="text-[11px] text-text-ghost">via {note.source}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!isCommand && !!note.content?.trim() && (
            <div className="flex items-center mr-1 border border-border-default rounded-md overflow-hidden">
              <button
                onClick={() => beautify.mutate({ id: note.id, mode: 'format' })}
                disabled={beautify.isPending || !!preview}
                title="Reformat only — keeps every word of your note"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Wand2 size={13} strokeWidth={1.5} />
                {beautify.isPending && beautify.variables?.mode === 'format'
                  ? 'Formatting…'
                  : 'Beautify'}
              </button>
              <span className="w-px self-stretch bg-border-default" />
              <button
                onClick={() => beautify.mutate({ id: note.id, mode: 'rewrite' })}
                disabled={beautify.isPending || !!preview}
                title="Rewrite for readability — may condense, merge repeats, and restructure into lists/tables"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {beautify.isPending && beautify.variables?.mode === 'rewrite'
                  ? 'Rewriting…'
                  : 'Beautify + Content'}
              </button>
              <span className="w-px self-stretch bg-border-default" />
              <button
                onClick={() => setAskOpen(o => !o)}
                disabled={beautify.isPending || !!preview}
                title="Tell the AI exactly how to format this note"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  askOpen
                    ? 'bg-surface-3 text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                }`}
              >
                {beautify.isPending && beautify.variables?.mode === 'custom'
                  ? 'Working…'
                  : 'Custom…'}
              </button>
            </div>
          )}
          {!isCommand && (
            <button
              onClick={() => handleCopy(displayContent)}
              title="Copy note"
              className="p-1.5 text-text-tertiary hover:text-text-primary transition-colors rounded hover:bg-surface-2"
            >
              {copied
                ? <Check size={14} strokeWidth={1.5} className="text-green-600" />
                : <Copy size={14} strokeWidth={1.5} />}
            </button>
          )}
          <button
            onClick={() => onEdit(note)}
            title="Edit"
            className="p-1.5 text-text-tertiary hover:text-text-primary transition-colors rounded hover:bg-surface-2"
          >
            <Edit2 size={14} strokeWidth={1.5} />
          </button>
          <button
            onClick={handleDelete}
            onBlur={() => setDeleteConfirm(false)}
            title={deleteConfirm ? 'Click again to delete' : 'Delete'}
            className={`p-1.5 rounded transition-colors ${
              deleteConfirm ? 'text-red-500 bg-red-50' : 'text-text-tertiary hover:text-red-500'
            }`}
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* ── Custom AI instruction bar ── */}
      {askOpen && preview === null && (
        <div className="flex items-center gap-2 px-8 py-2.5 bg-surface-1 border-b border-border-subtle flex-shrink-0">
          <Wand2 size={13} strokeWidth={1.5} className="text-text-tertiary flex-shrink-0" />
          <input
            autoFocus
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') submitInstruction()
              if (e.key === 'Escape') { setAskOpen(false); setInstruction('') }
            }}
            maxLength={500}
            placeholder='How should this note look? e.g. "turn the schedule into a table", "group commands by topic"…'
            className="flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-ghost outline-none"
          />
          <button
            onClick={submitInstruction}
            disabled={!instruction.trim() || beautify.isPending}
            className="px-3 py-1 text-[12px] bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-40 flex-shrink-0"
          >
            {beautify.isPending && beautify.variables?.mode === 'custom' ? 'Working…' : 'Go'}
          </button>
          <button
            onClick={() => { setAskOpen(false); setInstruction('') }}
            className="text-text-ghost hover:text-text-primary transition-colors flex-shrink-0"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* ── AI preview banner ── */}
      {preview !== null && (
        <div className="flex items-center justify-between gap-3 px-8 py-2.5 bg-accent-subtle border-b border-border-subtle flex-shrink-0">
          <span className="text-[12px] font-medium text-text-primary">
            Preview of the AI-formatted note — nothing saved yet.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreview(null)}
              className="px-2.5 py-1 text-[12px] text-text-secondary hover:text-text-primary transition-colors"
            >
              Discard
            </button>
            <button
              onClick={() => applyBeautify.mutate({ id: note.id, content: preview })}
              disabled={applyBeautify.isPending}
              className="px-3 py-1 text-[12px] bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {applyBeautify.isPending ? 'Saving…' : 'Keep this version'}
            </button>
          </div>
        </div>
      )}

      {aiError && (
        <div className="flex items-center gap-2 px-8 py-2 bg-red-50 border-b border-red-100 flex-shrink-0">
          <AlertTriangle size={12} strokeWidth={1.5} className="text-red-500 flex-shrink-0" />
          <span className="text-[12px] text-red-600">{aiError}</span>
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] px-8 py-6">
          {isCommand ? (
            <div className="flex flex-col gap-4">
              {/* Danger warning */}
              {note.warning && (
                <div className="flex items-start gap-2.5 px-3 py-2.5 bg-red-50 border border-red-200 rounded-md">
                  <AlertTriangle size={14} strokeWidth={1.5} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] text-red-600">{note.warning}</p>
                </div>
              )}

              {/* The actual command block */}
              <div className="flex flex-col gap-2">
                <p className="label text-text-tertiary">Command</p>
                <div className="flex items-start justify-between gap-3 bg-surface-1 border border-border-default rounded-md px-3 py-3">
                  <code className="font-mono text-[13px] text-text-primary flex-1 break-all">
                    {note.command}
                  </code>
                  <button
                    onClick={() => handleCopy(note.command ?? '')}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-text-secondary hover:text-text-primary border border-border-default rounded transition-colors flex-shrink-0"
                  >
                    {copied
                      ? <Check size={11} strokeWidth={1.5} className="text-green-600" />
                      : <Copy size={11} strokeWidth={1.5} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Explanation */}
              {note.content && (
                <div className="flex flex-col gap-2">
                  <p className="label text-text-tertiary">Explanation</p>
                  <p className="text-[13px] text-text-secondary leading-relaxed">{note.content}</p>
                </div>
              )}

              {(note.copyCount ?? 0) > 0 && (
                <p className="text-[11px] text-text-ghost">
                  Copied {note.copyCount} time{note.copyCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          ) : displayContent.trim() ? (
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(displayContent) }} />
          ) : (
            <p className="text-[13px] text-text-ghost">This note is empty.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
// Block-based, dependency-free. All input is HTML-escaped before rendering.

const MD_CLASSES = {
  h1: 'text-[18px] font-semibold text-text-primary mt-6 mb-2 first:mt-0',
  h2: 'text-[15px] font-semibold text-text-primary mt-5 mb-2 first:mt-0',
  h3: 'text-[13.5px] font-semibold text-text-primary mt-4 mb-1.5 first:mt-0',
  p: 'text-[13px] text-text-secondary leading-relaxed mb-3',
  ul: 'mb-3 pl-5 list-disc marker:text-text-ghost flex flex-col gap-1',
  ol: 'mb-3 pl-5 list-decimal marker:text-text-ghost flex flex-col gap-1',
  li: 'text-[13px] text-text-secondary leading-relaxed',
  pre: 'mb-3 bg-surface-1 border border-border-default rounded-md p-3 overflow-x-auto',
  preCode: 'font-mono text-[12px] text-text-primary leading-relaxed',
  code: 'font-mono text-[12px] bg-surface-2 px-1 py-0.5 rounded text-text-primary',
  blockquote: 'mb-3 border-l-2 border-border-strong pl-3 text-[13px] text-text-tertiary italic',
  hr: 'my-4 border-border-subtle',
  a: 'text-accent underline underline-offset-2 hover:opacity-80',
  tableWrap: 'mb-4 overflow-x-auto border border-border-default rounded-md',
  table: 'w-full border-collapse text-[12.5px]',
  th: 'text-left font-medium text-text-primary bg-surface-2 px-3 py-2 border-b border-border-default whitespace-nowrap',
  td: 'px-3 py-2 text-text-secondary border-b border-border-subtle align-top',
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderInline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, `<code class="${MD_CLASSES.code}">$1</code>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-text-primary">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(
      /\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
      `<a href="$2" target="_blank" rel="noopener noreferrer" class="${MD_CLASSES.a}">$1</a>`,
    )
}

function renderMarkdown(text: string): string {
  const lines = escapeHtml(text.replace(/\r\n/g, '\n')).split('\n')
  const html: string[] = []
  let list: 'ul' | 'ol' | null = null
  let inCode = false
  let codeLines: string[] = []
  let para: string[] = []
  let tableLines: string[] = []

  const closeList = () => {
    if (list) { html.push(`</${list}>`); list = null }
  }
  const flushPara = () => {
    if (para.length) {
      html.push(`<p class="${MD_CLASSES.p}">${renderInline(para.join(' '))}</p>`)
      para = []
    }
  }
  const flushCode = () => {
    html.push(
      `<pre class="${MD_CLASSES.pre}"><code class="${MD_CLASSES.preCode}">${codeLines.join('\n')}</code></pre>`,
    )
    codeLines = []
    inCode = false
  }

  const isTableRow = (line: string) => /^\s*\|.*\|\s*$/.test(line)
  const isSeparatorRow = (line: string) => /^[\s|:-]+$/.test(line) && line.includes('-')
  const parseCells = (line: string) =>
    line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())

  const flushTable = () => {
    if (!tableLines.length) return
    const rows = tableLines
    tableLines = []

    const hasHeader = rows.length >= 2 && isSeparatorRow(rows[1])
    const header = hasHeader ? parseCells(rows[0]) : null
    const bodyRows = (hasHeader ? rows.slice(2) : rows)
      .filter(r => !isSeparatorRow(r))
      .map(parseCells)

    const parts: string[] = [`<div class="${MD_CLASSES.tableWrap}"><table class="${MD_CLASSES.table}">`]
    if (header) {
      parts.push(
        '<thead><tr>',
        ...header.map(c => `<th class="${MD_CLASSES.th}">${renderInline(c)}</th>`),
        '</tr></thead>',
      )
    }
    parts.push('<tbody>')
    bodyRows.forEach((row, i) => {
      const tdClass =
        i === bodyRows.length - 1
          ? MD_CLASSES.td.replace('border-b border-border-subtle ', '')
          : MD_CLASSES.td
      parts.push('<tr>', ...row.map(c => `<td class="${tdClass}">${renderInline(c)}</td>`), '</tr>')
    })
    parts.push('</tbody></table></div>')
    html.push(parts.join(''))
  }

  for (const line of lines) {
    // Code fence toggles
    if (line.trim().startsWith('```')) {
      flushPara(); closeList(); flushTable()
      if (inCode) flushCode()
      else inCode = true
      continue
    }
    if (inCode) { codeLines.push(line); continue }

    // Table rows accumulate until a non-table line arrives
    if (isTableRow(line)) {
      flushPara(); closeList()
      tableLines.push(line)
      continue
    }
    flushTable()

    // Headings
    const heading = line.match(/^(#{1,3}) (.+)$/)
    if (heading) {
      flushPara(); closeList()
      const level = heading[1].length as 1 | 2 | 3
      const cls = level === 1 ? MD_CLASSES.h1 : level === 2 ? MD_CLASSES.h2 : MD_CLASSES.h3
      html.push(`<h${level} class="${cls}">${renderInline(heading[2])}</h${level}>`)
      continue
    }

    // Horizontal rule
    if (/^(---+|\*\*\*+)\s*$/.test(line.trim())) {
      flushPara(); closeList()
      html.push(`<hr class="${MD_CLASSES.hr}"/>`)
      continue
    }

    // Unordered list item
    const ulItem = line.match(/^\s*[-*] (.+)$/)
    if (ulItem) {
      flushPara()
      if (list !== 'ul') { closeList(); html.push(`<ul class="${MD_CLASSES.ul}">`); list = 'ul' }
      html.push(`<li class="${MD_CLASSES.li}">${renderInline(ulItem[1])}</li>`)
      continue
    }

    // Ordered list item
    const olItem = line.match(/^\s*\d+[.)] (.+)$/)
    if (olItem) {
      flushPara()
      if (list !== 'ol') { closeList(); html.push(`<ol class="${MD_CLASSES.ol}">`); list = 'ol' }
      html.push(`<li class="${MD_CLASSES.li}">${renderInline(olItem[1])}</li>`)
      continue
    }

    // Blockquote
    const quote = line.match(/^&gt; ?(.*)$/)
    if (quote) {
      flushPara(); closeList()
      html.push(`<blockquote class="${MD_CLASSES.blockquote}">${renderInline(quote[1])}</blockquote>`)
      continue
    }

    // Blank line ends the current block
    if (!line.trim()) { flushPara(); closeList(); continue }

    para.push(line.trim())
  }

  flushPara()
  closeList()
  flushTable()
  if (inCode) flushCode() // unterminated fence — render what we have

  return html.join('\n')
}
