'use client'
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Copy, Check, Clock, Hash, GripHorizontal } from 'lucide-react'

interface PingResult {
  status: number | null
  responseTime: number
  body: string | null
  headers: Record<string, string> | null
  error: string | null
  timestamp: string
}

interface Props {
  result: PingResult | null
  isPinging: boolean
}

const STATUS_TEXT: Record<number, string> = {
  200: 'OK', 201: 'Created', 204: 'No Content',
  301: 'Moved', 302: 'Found', 304: 'Not Modified',
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
  404: 'Not Found', 405: 'Not Allowed', 422: 'Unprocessable',
  429: 'Too Many Requests', 500: 'Server Error', 502: 'Bad Gateway',
  503: 'Unavailable', 504: 'Timeout',
}

function StatusPill({ status }: { status: number | null }) {
  if (!status) return null
  const isOk = status >= 200 && status < 300
  const isRedirect = status >= 300 && status < 400
  const color = isOk
    ? 'text-green-700 bg-green-50 border-green-200'
    : isRedirect
    ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-red-700 bg-red-50 border-red-200'
  return (
    <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${color}`}>
      {status} {STATUS_TEXT[status] ?? ''}
    </span>
  )
}

function highlightJson(json: string): React.ReactNode[] {
  const lines = json.split('\n')
  return lines.map((line, i) => {
    const parts: React.ReactNode[] = []
    let rest = line
    let k = 0

    const kvMatch = rest.match(/^(\s*)"([^"]+)"(\s*:\s*)(.*)/)
    if (kvMatch) {
      const [, indent, keyStr, colon, value] = kvMatch
      parts.push(
        <span key={k++} className="text-text-ghost">{indent}</span>,
        <span key={k++} className="text-accent">&quot;{keyStr}&quot;</span>,
        <span key={k++} className="text-text-ghost">{colon}</span>,
      )
      rest = value
    }

    const trimmed = rest.trim()
    if (/^".*"/.test(trimmed)) {
      parts.push(<span key={k++} className="text-amber-700">{rest}</span>)
    } else if (/^-?\d/.test(trimmed)) {
      parts.push(<span key={k++} className="text-blue-700">{rest}</span>)
    } else if (/^(true|false)/.test(trimmed)) {
      parts.push(<span key={k++} className="text-purple-700 italic">{rest}</span>)
    } else if (/^null/.test(trimmed)) {
      parts.push(<span key={k++} className="text-text-tertiary italic">{rest}</span>)
    } else {
      parts.push(<span key={k++} className="text-text-ghost">{rest}</span>)
    }

    return (
      <div key={i} className="flex min-h-[20px]">
        <span className="inline-block w-10 text-right pr-3 text-text-ghost select-none text-[11px] flex-shrink-0 border-r border-border-subtle mr-3">
          {i + 1}
        </span>
        <span className="flex-1">{parts}</span>
      </div>
    )
  })
}

export function ResponsePanel({ result, isPinging }: Props) {
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body')
  const [copied, setCopied] = useState(false)

  const responseSize = useMemo(() => {
    if (!result?.body) return null
    const bytes = new Blob([result.body]).size
    return bytes > 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`
  }, [result?.body])

  const isJson = useMemo(() => {
    if (!result?.body) return false
    try { JSON.parse(result.body); return true } catch { return false }
  }, [result?.body])

  function handleCopy() {
    if (!result?.body) return
    navigator.clipboard.writeText(result.body)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Loading
  if (isPinging) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-text-secondary">Sending request...</p>
        </div>
      </div>
    )
  }

  // Empty
  if (!result) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-surface-0 flex items-center justify-center mb-1">
            <span className="text-[16px] text-text-ghost font-mono">&gt;_</span>
          </div>
          <p className="text-[13px] text-text-secondary">Enter a URL and hit Send</p>
          <p className="text-[11px] text-text-ghost">
            or press <kbd className="kbd">Enter</kbd> in the URL bar
          </p>
        </div>
      </div>
    )
  }

  // Error
  if (result.error) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border-default flex-shrink-0">
          <span className="text-[11px] font-mono font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
            Error
          </span>
          <span className="flex items-center gap-1 text-[11px] text-text-tertiary font-mono">
            <Clock size={11} strokeWidth={1.5} />
            {result.responseTime}ms
          </span>
        </div>
        <div className="flex-1 p-4 bg-surface-0">
          <p className="text-[13px] text-red-500 font-mono">{result.error}</p>
        </div>
      </div>
    )
  }

  // Success
  const headerCount = result.headers ? Object.keys(result.headers).length : 0

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar: tabs left, meta right */}
      <div className="flex items-center px-3 border-b border-border-default flex-shrink-0">
        <div className="flex items-center gap-0">
          <button
            onClick={() => setActiveTab('body')}
            className={`relative px-3 py-2 text-[12px] transition-colors ${
              activeTab === 'body'
                ? 'text-accent font-medium'
                : 'text-text-tertiary hover:text-text-primary'
            }`}
          >
            Body
            {activeTab === 'body' && (
              <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('headers')}
            className={`relative px-3 py-2 text-[12px] transition-colors ${
              activeTab === 'headers'
                ? 'text-accent font-medium'
                : 'text-text-tertiary hover:text-text-primary'
            }`}
          >
            Headers
            {headerCount > 0 && (
              <span className={`ml-0.5 text-[10px] font-bold ${activeTab === 'headers' ? 'text-accent' : 'text-text-ghost'}`}>
                {headerCount}
              </span>
            )}
            {activeTab === 'headers' && (
              <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-full" />
            )}
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <StatusPill status={result.status} />
          <span className="flex items-center gap-1 text-[11px] text-text-tertiary font-mono">
            <Clock size={11} strokeWidth={1.5} />
            {result.responseTime}ms
          </span>
          {responseSize && (
            <span className="flex items-center gap-1 text-[11px] text-text-tertiary font-mono">
              <Hash size={11} strokeWidth={1.5} />
              {responseSize}
            </span>
          )}
          <div className="w-px h-4 bg-border-default" />
          <button
            onClick={handleCopy}
            className="p-1 text-text-ghost hover:text-text-primary rounded transition-colors"
            title="Copy response"
          >
            {copied
              ? <Check size={13} strokeWidth={1.5} className="text-green-600" />
              : <Copy size={13} strokeWidth={1.5} />
            }
          </button>
        </div>
      </div>

      {/* Content — inset surface-0 background */}
      <div className="flex-1 overflow-y-auto bg-surface-0">
        {activeTab === 'body' ? (
          <pre className="p-4 text-[12px] font-mono leading-relaxed whitespace-pre-wrap break-all">
            {isJson
              ? highlightJson(result.body!)
              : (result.body || <span className="text-text-ghost italic">Empty response body</span>)
            }
          </pre>
        ) : (
          <div className="p-4">
            <div className="flex gap-3 pb-1.5 mb-1 border-b border-border-default">
              <span className="text-[10px] uppercase tracking-wider text-text-ghost font-medium w-52 flex-shrink-0">Name</span>
              <span className="text-[10px] uppercase tracking-wider text-text-ghost font-medium flex-1">Value</span>
            </div>
            {result.headers && Object.entries(result.headers).map(([key, value]) => (
              <div key={key} className="flex gap-3 py-1.5 border-b border-border-subtle last:border-0">
                <span className="text-[11px] font-mono font-semibold text-text-secondary w-52 flex-shrink-0 truncate">{key}</span>
                <span className="text-[11px] font-mono text-text-primary break-all flex-1">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Resize handle between the two cards.
 * Visible on the bg-surface-2 gap between cards.
 */
export function ResizeHandle({ onDrag }: { onDrag: (deltaY: number) => void }) {
  const dragging = useRef(false)
  const lastY = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    lastY.current = e.clientY
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return
      const delta = e.clientY - lastY.current
      lastY.current = e.clientY
      onDrag(delta)
    }
    function onMouseUp() {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onDrag])

  return (
    <div
      onMouseDown={onMouseDown}
      className="flex items-center justify-center h-3 cursor-row-resize group flex-shrink-0"
    >
      <GripHorizontal size={16} strokeWidth={1.5} className="text-border-strong group-hover:text-accent transition-colors" />
    </div>
  )
}
