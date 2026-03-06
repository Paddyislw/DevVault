'use client'
import { useCallback } from 'react'
import { Send } from 'lucide-react'
import { parseCurl, type ParsedCurl } from '@/lib/curl-parser'

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
export type Method = (typeof METHODS)[number]

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-700',
  POST: 'text-blue-700',
  PUT: 'text-amber-700',
  PATCH: 'text-purple-700',
  DELETE: 'text-red-700',
}

const METHOD_BG: Record<string, string> = {
  GET: 'bg-green-50',
  POST: 'bg-blue-50',
  PUT: 'bg-amber-50',
  PATCH: 'bg-purple-50',
  DELETE: 'bg-red-50',
}

interface Props {
  method: Method
  url: string
  onMethodChange: (m: Method) => void
  onUrlChange: (u: string) => void
  onSend: () => void
  onCurlParsed?: (parsed: ParsedCurl) => void
  isSending: boolean
}

export function UrlBar({ method, url, onMethodChange, onUrlChange, onSend, onCurlParsed, isSending }: Props) {
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').trim()
    if (!text.toLowerCase().startsWith('curl')) return

    const parsed = parseCurl(text)
    if (!parsed) return

    e.preventDefault()
    onCurlParsed?.(parsed)
  }, [onCurlParsed])

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-default flex-shrink-0">
      <div className={`flex items-center rounded px-2 py-1 ${METHOD_BG[method]}`}>
        <select
          value={method}
          onChange={e => onMethodChange(e.target.value as Method)}
          className={`bg-transparent text-[12px] font-mono font-bold outline-none cursor-pointer ${METHOD_COLORS[method]}`}
        >
          {METHODS.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <input
        value={url}
        onChange={e => onUrlChange(e.target.value)}
        onPaste={handlePaste}
        onKeyDown={e => {
          if (e.key === 'Enter') onSend()
        }}
        placeholder="Enter URL or paste cURL command"
        autoFocus
        className="flex-1 px-2 py-1 bg-transparent text-[13px] font-mono text-text-primary placeholder:text-text-tertiary outline-none"
      />
      <button
        onClick={onSend}
        disabled={isSending || !url.trim()}
        className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send size={13} strokeWidth={1.5} />
        {isSending ? 'Sending...' : 'Send'}
      </button>
    </div>
  )
}
