'use client'
import { useState, useMemo } from 'react'
import { Plus, ChevronDown, ChevronRight, Clock } from 'lucide-react'
import { api } from '@/lib/trpc'

export interface Endpoint {
  id: string
  name: string
  url: string
  method: string
  headers: unknown
  body: unknown
  authType: string | null
  authValue: string | null
  projectName: string | null
}

/* HTTP method colors — semantic, intentionally not tokenized */
const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-600 bg-green-50',
  POST: 'text-blue-600 bg-blue-50',
  PUT: 'text-amber-600 bg-amber-50',
  PATCH: 'text-purple-600 bg-purple-50',
  DELETE: 'text-red-600 bg-red-50',
}

interface Props {
  onSelectEndpoint: (endpoint: Endpoint) => void
  selectedId: string | null
  onNewRequest: () => void
  loadedEndpointId: string | null
}

export function SidePanel({ onSelectEndpoint, selectedId, onNewRequest, loadedEndpointId }: Props) {
  const [sideTab, setSideTab] = useState<'saved' | 'history'>('saved')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const { data: _endpoints = [], isLoading } = api.apiEndpoints.list.useQuery({})
  const endpoints = _endpoints as unknown as Endpoint[]
  interface PingHistoryItem {
    id: string
    status: number | null
    responseTime: number
    error: string | null
    createdAt: string
  }
  const { data: _history = [] } = api.apiEndpoints.history.useQuery(
    { id: loadedEndpointId! },
    { enabled: !!loadedEndpointId }
  )
  const history = _history as unknown as PingHistoryItem[]

  // Group endpoints by projectName
  const grouped = useMemo(() => {
    const groups: Record<string, Endpoint[]> = {}
    for (const ep of endpoints) {
      const key = ep.projectName ?? 'Ungrouped'
      if (!groups[key]) groups[key] = []
      groups[key].push(ep)
    }
    return Object.entries(groups).sort(([a], [b]) =>
      a === 'Ungrouped' ? 1 : b === 'Ungrouped' ? -1 : a.localeCompare(b)
    )
  }, [endpoints])

  // Auto-expand all groups on first render
  useMemo(() => {
    if (grouped.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set(grouped.map(([key]) => key)))
    }
  }, [grouped.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleGroup(group: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(group) ? next.delete(group) : next.add(group)
      return next
    })
  }

  return (
    <div className="w-64 flex-shrink-0 border-r border-border-default flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border-subtle">
        {(['saved', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSideTab(tab)}
            className={`flex-1 px-3 py-2.5 text-[11px] font-medium uppercase tracking-wider text-center transition-colors border-b-2 -mb-px ${
              sideTab === tab
                ? 'border-accent text-accent'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* New Request button */}
      <div className="px-3 py-2 border-b border-border-subtle">
        <button
          onClick={onNewRequest}
          className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[12px] text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded transition-colors"
        >
          <Plus size={12} strokeWidth={1.5} />
          New Request
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-1">
        {sideTab === 'saved' ? (
          isLoading ? (
            <div className="flex flex-col gap-1 p-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 animate-pulse rounded bg-surface-2" style={{ opacity: 1 - i * 0.2 }} />
              ))}
            </div>
          ) : endpoints.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-1 px-4 text-center">
              <p className="text-[12px] text-text-secondary">No saved endpoints.</p>
              <p className="text-[11px] text-text-ghost">Send a request, then save it.</p>
            </div>
          ) : (
            grouped.map(([group, eps]) => (
              <div key={group} className="mb-1">
                <button
                  onClick={() => toggleGroup(group)}
                  className="flex items-center gap-1 w-full px-3 py-1.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider hover:text-text-secondary transition-colors"
                >
                  {expandedGroups.has(group)
                    ? <ChevronDown size={12} strokeWidth={1.5} />
                    : <ChevronRight size={12} strokeWidth={1.5} />
                  }
                  {group}
                  <span className="ml-auto text-[10px] font-normal">{eps.length}</span>
                </button>
                {expandedGroups.has(group) && eps.map(ep => (
                  <button
                    key={ep.id}
                    onClick={() => onSelectEndpoint(ep)}
                    className={`w-full text-left px-3 py-2 pl-7 flex items-center gap-2 transition-colors ${
                      selectedId === ep.id ? 'bg-surface-3' : 'hover:bg-surface-2'
                    }`}
                  >
                    <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${METHOD_COLORS[ep.method] ?? 'text-text-secondary bg-surface-2'}`}>
                      {ep.method}
                    </span>
                    <span className="text-[12px] text-text-primary truncate">{ep.name}</span>
                  </button>
                ))}
              </div>
            ))
          )
        ) : (
          // History tab
          !loadedEndpointId ? (
            <div className="flex flex-col items-center justify-center h-full gap-1 px-4 text-center">
              <p className="text-[12px] text-text-secondary">No history for ad-hoc requests.</p>
              <p className="text-[11px] text-text-ghost">Save an endpoint to track history.</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-1 px-4 text-center">
              <p className="text-[12px] text-text-secondary">No ping history yet.</p>
              <p className="text-[11px] text-text-ghost">Hit Send to create one.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 p-2">
              {history.map(ping => (
                <div
                  key={ping.id}
                  className="flex items-center gap-2 px-2 py-2 rounded hover:bg-surface-2 transition-colors"
                >
                  {ping.status ? (
                    <span className={`text-[10px] font-mono font-semibold ${
                      ping.status >= 200 && ping.status < 300 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {ping.status}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-red-500">ERR</span>
                  )}
                  <span className="flex items-center gap-1 text-[11px] text-text-tertiary font-mono">
                    <Clock size={10} strokeWidth={1.5} />
                    {ping.responseTime}ms
                  </span>
                  <span className="ml-auto text-[10px] text-text-ghost">
                    {new Date(ping.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
