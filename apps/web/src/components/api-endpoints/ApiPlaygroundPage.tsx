'use client'
import { useState, useCallback, useRef } from 'react'
import { PanelLeftClose, PanelLeftOpen, BookmarkPlus, Copy, Check } from 'lucide-react'
import { api } from '@/lib/trpc'
import { PageHeader } from '@/components/shared/page-header'
import { parseQueryParams, buildUrlWithParams, type ParsedCurl } from '@/lib/curl-parser'
import { UrlBar, type Method } from './UrlBar'
import { RequestConfig, type AuthType } from './RequestConfig'
import { ResponsePanel, ResizeHandle } from './ResponsePanel'
import { SidePanel, type Endpoint } from './SidePanel'
import { AddEndpointModal } from './AddEndpointModal'

type PingResult = {
  status: number | null
  responseTime: number
  body: string | null
  headers: Record<string, string> | null
  error: string | null
  timestamp: string
}

export function ApiPlaygroundPage() {
  // Request state
  const [method, setMethod] = useState<Method>('GET')
  const [url, setUrl] = useState('')
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }])
  const [body, setBody] = useState('')
  const [authType, setAuthType] = useState<AuthType>('NONE')
  const [authValue, setAuthValue] = useState('')
  const [queryParams, setQueryParams] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }])

  // UI state
  const [sidePanelOpen, setSidePanelOpen] = useState(true)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [requestHeight, setRequestHeight] = useState(240)
  const [copiedCurl, setCopiedCurl] = useState(false)

  // Response state
  const [response, setResponse] = useState<PingResult | null>(null)

  // Loaded endpoint tracking
  const [loadedEndpointId, setLoadedEndpointId] = useState<string | null>(null)

  // Guard to prevent circular URL ↔ params sync
  const syncSource = useRef<'url' | 'params' | null>(null)

  const utils = api.useUtils()

  const proxyMutation = api.apiEndpoints.proxyRequest.useMutation({
    onSuccess: (result) => setResponse(result),
  })

  const pingMutation = api.apiEndpoints.ping.useMutation({
    onSuccess: (result) => {
      setResponse(result)
      utils.apiEndpoints.list.invalidate()
      utils.apiEndpoints.history.invalidate()
    },
  })

  const isSending = proxyMutation.isPending || pingMutation.isPending

  const handleResize = useCallback((deltaY: number) => {
    setRequestHeight(h => Math.max(120, Math.min(500, h + deltaY)))
  }, [])

  function getHeadersObj(): Record<string, string> {
    return headers.reduce((acc, { key, value }) => {
      if (key.trim()) acc[key.trim()] = value
      return acc
    }, {} as Record<string, string>)
  }

  const handleUrlChange = useCallback((newUrl: string) => {
    setUrl(newUrl)
    if (syncSource.current === 'params') return
    syncSource.current = 'url'
    const params = parseQueryParams(newUrl)
    setQueryParams(params.length > 0 ? [...params, { key: '', value: '' }] : [{ key: '', value: '' }])
    syncSource.current = null
  }, [])

  const handleQueryParamsChange = useCallback((newParams: { key: string; value: string }[]) => {
    setQueryParams(newParams)
    if (syncSource.current === 'url') return
    syncSource.current = 'params'
    const filledParams = newParams.filter(p => p.key.trim())
    if (filledParams.length > 0 && url) {
      setUrl(buildUrlWithParams(url, filledParams))
    } else if (filledParams.length === 0 && url) {
      try {
        const u = new URL(url.match(/^https?:\/\//) ? url : `https://${url}`)
        u.search = ''
        setUrl(u.toString())
      } catch { /* keep url as-is */ }
    }
    syncSource.current = null
  }, [url])

  const handleCurlParsed = useCallback((parsed: ParsedCurl) => {
    setMethod(parsed.method as Method)
    setUrl(parsed.url)
    setHeaders(
      parsed.headers.length > 0
        ? [...parsed.headers, { key: '', value: '' }]
        : [{ key: '', value: '' }]
    )
    setBody(parsed.body)
    setAuthType(parsed.authType)
    setAuthValue(parsed.authValue)
    setLoadedEndpointId(null)
    setResponse(null)

    const params = parseQueryParams(parsed.url)
    setQueryParams(params.length > 0 ? [...params, { key: '', value: '' }] : [{ key: '', value: '' }])
  }, [])

  function handleSend() {
    if (!url.trim()) return
    const normalizedUrl = url.match(/^https?:\/\//) ? url : `https://${url}`
    const headersObj = getHeadersObj()

    if (loadedEndpointId) {
      pingMutation.mutate({
        id: loadedEndpointId,
        url: normalizedUrl,
        method,
        headers: headersObj,
        body: body || undefined,
        authType,
        authValue: authValue || undefined,
      })
    } else {
      proxyMutation.mutate({
        url: normalizedUrl,
        method,
        headers: headersObj,
        body: body || undefined,
        authType,
        authValue: authValue || undefined,
      })
    }
  }

  function handleLoadEndpoint(endpoint: Endpoint) {
    setMethod(endpoint.method as Method)
    setUrl(endpoint.url)
    setHeaders(
      Object.entries((endpoint.headers as Record<string, string>) ?? {})
        .map(([key, value]) => ({ key, value }))
        .concat([{ key: '', value: '' }])
    )
    setBody((endpoint.body as any)?.raw ?? '')
    setAuthType((endpoint.authType ?? 'NONE') as AuthType)
    setAuthValue(endpoint.authValue ?? '')
    setLoadedEndpointId(endpoint.id)
    setResponse(null)

    const params = parseQueryParams(endpoint.url)
    setQueryParams(params.length > 0 ? [...params, { key: '', value: '' }] : [{ key: '', value: '' }])
  }

  function handleNewRequest() {
    setMethod('GET')
    setUrl('')
    setHeaders([{ key: '', value: '' }])
    setBody('')
    setAuthType('NONE')
    setAuthValue('')
    setQueryParams([{ key: '', value: '' }])
    setLoadedEndpointId(null)
    setResponse(null)
  }

  function handleCopyCurl() {
    const normalizedUrl = url.match(/^https?:\/\//) ? url : `https://${url}`
    const headersObj = getHeadersObj()
    let curl = `curl -X ${method} '${normalizedUrl}'`
    Object.entries(headersObj).forEach(([k, v]) => {
      curl += ` \\\n  -H '${k}: ${v}'`
    })
    if (authType === 'BEARER' && authValue) {
      curl += ` \\\n  -H 'Authorization: Bearer ${authValue}'`
    } else if (authType === 'API_KEY' && authValue) {
      curl += ` \\\n  -H 'X-API-Key: ${authValue}'`
    }
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      curl += ` \\\n  -d '${body}'`
    }
    navigator.clipboard.writeText(curl)
    setCopiedCurl(true)
    setTimeout(() => setCopiedCurl(false), 2000)
  }

  function handleSaved(id: string) {
    setLoadedEndpointId(id)
    utils.apiEndpoints.list.invalidate()
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="API Playground"
        subtitle={loadedEndpointId ? 'Saved endpoint loaded' : 'Ad-hoc request'}
      >
        <button
          onClick={() => setSidePanelOpen(!sidePanelOpen)}
          className="p-1.5 text-text-tertiary hover:text-text-primary rounded transition-colors"
          title="Toggle sidebar"
        >
          {sidePanelOpen
            ? <PanelLeftClose size={16} strokeWidth={1.5} />
            : <PanelLeftOpen size={16} strokeWidth={1.5} />
          }
        </button>
        <button
          onClick={handleCopyCurl}
          disabled={!url.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-text-secondary hover:text-text-primary border border-border-default rounded transition-colors disabled:opacity-40"
        >
          {copiedCurl
            ? <Check size={12} strokeWidth={1.5} className="text-green-600" />
            : <Copy size={12} strokeWidth={1.5} />
          }
          {copiedCurl ? 'Copied!' : 'cURL'}
        </button>
        <button
          onClick={() => setSaveModalOpen(true)}
          disabled={!url.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-text-secondary hover:text-text-primary border border-border-default rounded transition-colors disabled:opacity-40"
        >
          <BookmarkPlus size={12} strokeWidth={1.5} />
          Save
        </button>
      </PageHeader>

      <div className="flex flex-1 overflow-hidden">
        {sidePanelOpen && (
          <SidePanel
            onSelectEndpoint={handleLoadEndpoint}
            selectedId={loadedEndpointId}
            onNewRequest={handleNewRequest}
            loadedEndpointId={loadedEndpointId}
          />
        )}

        {/* Main workspace — padded container with visible sections */}
        <div className="flex-1 flex flex-col min-h-0 bg-surface-2 p-3 gap-0">
          {/* Request card — white card with border */}
          <div
            className="flex flex-col bg-surface-1 rounded border border-border-default overflow-hidden flex-shrink-0"
            style={{ height: requestHeight, minHeight: 120, maxHeight: 500 }}
          >
            <UrlBar
              method={method}
              url={url}
              onMethodChange={setMethod}
              onUrlChange={handleUrlChange}
              onSend={handleSend}
              onCurlParsed={handleCurlParsed}
              isSending={isSending}
            />
            <div className="flex-1 overflow-hidden">
              <RequestConfig
                headers={headers}
                onHeadersChange={setHeaders}
                body={body}
                onBodyChange={setBody}
                authType={authType}
                authValue={authValue}
                onAuthTypeChange={setAuthType}
                onAuthValueChange={setAuthValue}
                queryParams={queryParams}
                onQueryParamsChange={handleQueryParamsChange}
              />
            </div>
          </div>

          {/* Resize handle */}
          <ResizeHandle onDrag={handleResize} />

          {/* Response card — white card with border */}
          <div className="flex-1 flex flex-col bg-surface-1 rounded border border-border-default overflow-hidden min-h-0">
            <ResponsePanel result={response} isPinging={isSending} />
          </div>
        </div>
      </div>

      <AddEndpointModal
        key={saveModalOpen ? 'save' : 'closed'}
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        prefill={{
          url,
          method,
          headers: getHeadersObj(),
          body,
          authType,
          authValue,
        }}
        onSaved={handleSaved}
      />
    </div>
  )
}
