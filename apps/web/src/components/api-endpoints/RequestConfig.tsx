'use client'
import { useState } from 'react'
import { FileJson, Braces, Lock, Plus, Trash2, ChevronUp, ChevronDown, Search } from 'lucide-react'

export type AuthType = 'NONE' | 'BEARER' | 'API_KEY' | 'BASIC'
const AUTH_TYPES = ['NONE', 'BEARER', 'API_KEY', 'BASIC'] as const

interface Props {
  headers: { key: string; value: string }[]
  onHeadersChange: (h: { key: string; value: string }[]) => void
  body: string
  onBodyChange: (b: string) => void
  authType: AuthType
  authValue: string
  onAuthTypeChange: (a: AuthType) => void
  onAuthValueChange: (v: string) => void
  queryParams: { key: string; value: string }[]
  onQueryParamsChange: (p: { key: string; value: string }[]) => void
}

type Tab = 'params' | 'headers' | 'body' | 'auth'

export function RequestConfig({
  headers, onHeadersChange,
  body, onBodyChange,
  authType, authValue, onAuthTypeChange, onAuthValueChange,
  queryParams, onQueryParamsChange,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('params')
  const [collapsed, setCollapsed] = useState(false)

  const headerCount = headers.filter(h => h.key.trim()).length
  const paramCount = queryParams.filter(p => p.key.trim()).length

  function handleTabClick(tab: Tab) {
    if (activeTab === tab) {
      setCollapsed(!collapsed)
    } else {
      setActiveTab(tab)
      setCollapsed(false)
    }
  }

  function updateHeader(i: number, field: 'key' | 'value', val: string) {
    const next = headers.map((h, idx) => idx === i ? { ...h, [field]: val } : h)
    if (i === next.length - 1 && (next[i].key || next[i].value)) {
      next.push({ key: '', value: '' })
    }
    onHeadersChange(next)
  }

  function removeHeader(i: number) {
    if (headers.length <= 1) return
    onHeadersChange(headers.filter((_, idx) => idx !== i))
  }

  function addHeader() {
    onHeadersChange([...headers, { key: '', value: '' }])
  }

  function updateParam(i: number, field: 'key' | 'value', val: string) {
    const next = queryParams.map((p, idx) => idx === i ? { ...p, [field]: val } : p)
    if (i === next.length - 1 && (next[i].key || next[i].value)) {
      next.push({ key: '', value: '' })
    }
    onQueryParamsChange(next)
  }

  function removeParam(i: number) {
    if (queryParams.length <= 1) return
    onQueryParamsChange(queryParams.filter((_, idx) => idx !== i))
  }

  function addParam() {
    onQueryParamsChange([...queryParams, { key: '', value: '' }])
  }

  function renderKvRows(
    rows: { key: string; value: string }[],
    onUpdate: (i: number, field: 'key' | 'value', val: string) => void,
    onRemove: (i: number) => void,
    onAdd: () => void,
    addLabel: string,
  ) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 px-0.5">
          <span className="flex-1 text-[10px] uppercase tracking-wider text-text-ghost font-medium">Key</span>
          <span className="flex-[2] text-[10px] uppercase tracking-wider text-text-ghost font-medium">Value</span>
          <span className="w-6" />
        </div>
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={row.key}
              onChange={e => onUpdate(i, 'key', e.target.value)}
              placeholder="key"
              className="flex-1 bg-surface-0 border border-border-default rounded px-2.5 py-1.5 text-[12px] font-mono text-text-primary placeholder:text-text-ghost focus:outline-none focus:border-accent transition-colors"
            />
            <input
              value={row.value}
              onChange={e => onUpdate(i, 'value', e.target.value)}
              placeholder="value"
              className="flex-[2] bg-surface-0 border border-border-default rounded px-2.5 py-1.5 text-[12px] font-mono text-text-primary placeholder:text-text-ghost focus:outline-none focus:border-accent transition-colors"
            />
            <button
              onClick={() => onRemove(i)}
              className="p-1 text-text-ghost hover:text-red-500 transition-colors"
            >
              <Trash2 size={12} strokeWidth={1.5} />
            </button>
          </div>
        ))}
        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-accent transition-colors w-fit mt-0.5"
        >
          <Plus size={11} strokeWidth={1.5} />
          {addLabel}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar — sits on the white card surface */}
      <div className="flex items-center gap-0 px-3 border-b border-border-default flex-shrink-0">
        {([
          { key: 'params' as Tab, icon: Search, label: 'Params', count: paramCount },
          { key: 'headers' as Tab, icon: FileJson, label: 'Headers', count: headerCount },
          { key: 'body' as Tab, icon: Braces, label: 'Body', count: 0 },
          { key: 'auth' as Tab, icon: Lock, label: 'Auth', count: 0 },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab.key)}
            className={`relative flex items-center gap-1.5 px-3 py-2 text-[12px] transition-colors ${
              activeTab === tab.key && !collapsed
                ? 'text-accent font-medium'
                : 'text-text-tertiary hover:text-text-primary'
            }`}
          >
            <tab.icon size={13} strokeWidth={1.5} />
            {tab.label}
            {tab.count > 0 && (
              <span className="text-[10px] font-bold text-accent ml-0.5">
                {tab.count}
              </span>
            )}
            {activeTab === tab.key && !collapsed && (
              <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-full" />
            )}
          </button>
        ))}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1.5 text-text-ghost hover:text-text-primary rounded transition-colors"
        >
          {collapsed ? <ChevronDown size={13} strokeWidth={1.5} /> : <ChevronUp size={13} strokeWidth={1.5} />}
        </button>
      </div>

      {/* Tab content — surface-0 inset background for contrast */}
      {!collapsed && (
        <div className="px-3 py-2.5 flex-1 overflow-y-auto bg-surface-0">
          {activeTab === 'params' && renderKvRows(queryParams, updateParam, removeParam, addParam, 'Add param')}
          {activeTab === 'headers' && renderKvRows(headers, updateHeader, removeHeader, addHeader, 'Add header')}

          {activeTab === 'body' && (
            <textarea
              value={body}
              onChange={e => onBodyChange(e.target.value)}
              placeholder={'{\n  "key": "value"\n}'}
              rows={6}
              className="w-full bg-surface-1 border border-border-default rounded px-3 py-2 text-[12px] font-mono text-text-primary placeholder:text-text-ghost focus:outline-none focus:border-accent resize-none transition-colors"
            />
          )}

          {activeTab === 'auth' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider text-text-ghost font-medium">Auth type</label>
                <select
                  value={authType}
                  onChange={e => onAuthTypeChange(e.target.value as AuthType)}
                  className="bg-surface-1 border border-border-default rounded px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent w-48 transition-colors"
                >
                  {AUTH_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              {authType !== 'NONE' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-text-ghost font-medium">
                    {authType === 'BEARER' ? 'Token' : authType === 'BASIC' ? 'username:password' : 'API Key'}
                  </label>
                  <input
                    value={authValue}
                    onChange={e => onAuthValueChange(e.target.value)}
                    placeholder={authType === 'BASIC' ? 'user:password' : 'Enter value...'}
                    className="bg-surface-1 border border-border-default rounded px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-ghost focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
