/**
 * Parses a cURL command string into structured request data.
 * Handles: -X method, -H headers, -d/--data body, --data-raw,
 * Authorization header → auth type extraction, URL extraction.
 */

export interface ParsedCurl {
  method: string
  url: string
  headers: { key: string; value: string }[]
  body: string
  authType: 'NONE' | 'BEARER' | 'API_KEY' | 'BASIC'
  authValue: string
}

export function parseCurl(raw: string): ParsedCurl | null {
  const input = raw.trim()
  if (!input.toLowerCase().startsWith('curl')) return null

  // Normalize line continuations (backslash + newline) into single line
  const normalized = input.replace(/\\\s*\n/g, ' ').replace(/\s+/g, ' ')

  const result: ParsedCurl = {
    method: 'GET',
    url: '',
    headers: [],
    body: '',
    authType: 'NONE',
    authValue: '',
  }

  const tokens = tokenize(normalized)

  // Flags that take an argument (next token) — skip both flag and value
  const FLAGS_WITH_ARG = new Set([
    '-o', '--output', '-O', '--remote-name',
    '-w', '--write-out', '-T', '--upload-file',
    '-e', '--referer', '-A', '--user-agent',
    '--connect-timeout', '--max-time', '-m',
    '--retry', '--retry-delay', '--retry-max-time',
    '-x', '--proxy', '-U', '--proxy-user',
    '--resolve', '--cert', '--key', '--cacert',
    '--interface', '--local-port', '-E',
    '--dns-servers', '--limit-rate',
    '--max-redirs', '-C', '--continue-at',
  ])

  // Boolean flags (no argument) — skip
  const BOOLEAN_FLAGS = new Set([
    '-L', '--location', '--compressed', '-k', '--insecure',
    '-s', '--silent', '-S', '--show-error',
    '-v', '--verbose', '-i', '--include',
    '-I', '--head', '-N', '--no-buffer',
    '--raw', '--tr-encoding', '-f', '--fail',
    '-g', '--globoff', '--http1.1', '--http2',
  ])

  let i = 0
  while (i < tokens.length) {
    const token = tokens[i]

    if (token === '-X' || token === '--request') {
      i++
      if (i < tokens.length) result.method = tokens[i].toUpperCase()
    } else if (token === '-H' || token === '--header') {
      i++
      if (i < tokens.length) {
        const headerStr = tokens[i]
        const colonIdx = headerStr.indexOf(':')
        if (colonIdx > 0) {
          const key = headerStr.slice(0, colonIdx).trim()
          const value = headerStr.slice(colonIdx + 1).trim()
          result.headers.push({ key, value })
        }
      }
    } else if (token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary' || token === '--data-urlencode') {
      i++
      if (i < tokens.length) {
        result.body = tokens[i]
        if (result.method === 'GET') result.method = 'POST'
      }
    } else if (token === '-u' || token === '--user') {
      i++
      if (i < tokens.length) {
        result.authType = 'BASIC'
        result.authValue = tokens[i]
      }
    } else if (token === '-b' || token === '--cookie') {
      // Convert -b cookies to a Cookie header
      i++
      if (i < tokens.length) {
        result.headers.push({ key: 'Cookie', value: tokens[i] })
      }
    } else if (FLAGS_WITH_ARG.has(token)) {
      // Known flag that takes an argument — skip it
      i++
    } else if (BOOLEAN_FLAGS.has(token)) {
      // Known boolean flag — skip
    } else if (token.startsWith('-') && token !== 'curl') {
      // Unknown flag — if next token looks like a value (not a flag, not a URL), skip it
      if (i + 1 < tokens.length && !tokens[i + 1].startsWith('-') &&
          !tokens[i + 1].startsWith('http://') && !tokens[i + 1].startsWith('https://')) {
        i++ // skip the argument
      }
    } else if (
      !token.startsWith('-') &&
      token !== 'curl' &&
      (token.startsWith('http://') || token.startsWith('https://'))
    ) {
      // URL — only match explicit http(s) URLs, not arbitrary strings with dots
      result.url = token
    } else if (
      !token.startsWith('-') &&
      token !== 'curl' &&
      !result.url &&
      token.includes('.') &&
      token.includes('/')
    ) {
      // Fallback: bare domain with path like "api.example.com/users"
      result.url = token
    }

    i++
  }

  if (!result.url) return null

  // Extract auth from headers
  const authHeaderIdx = result.headers.findIndex(
    h => h.key.toLowerCase() === 'authorization'
  )
  if (authHeaderIdx >= 0) {
    const authHeader = result.headers[authHeaderIdx]
    result.headers.splice(authHeaderIdx, 1)

    if (authHeader.value.toLowerCase().startsWith('bearer ')) {
      result.authType = 'BEARER'
      result.authValue = authHeader.value.slice(7).trim()
    } else if (authHeader.value.toLowerCase().startsWith('basic ')) {
      result.authType = 'BASIC'
      result.authValue = authHeader.value.slice(6).trim()
    }
  }

  // Check for X-API-Key style headers
  const apiKeyIdx = result.headers.findIndex(
    h => h.key.toLowerCase() === 'x-api-key'
  )
  if (apiKeyIdx >= 0 && result.authType === 'NONE') {
    result.authType = 'API_KEY'
    result.authValue = result.headers[apiKeyIdx].value
    result.headers.splice(apiKeyIdx, 1)
  }

  return result
}

/**
 * Splits a cURL command into tokens, respecting single and double quotes.
 */
function tokenize(input: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inSingle = false
  let inDouble = false
  let escape = false

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]

    if (escape) {
      current += ch
      escape = false
      continue
    }

    if (ch === '\\' && !inSingle) {
      escape = true
      continue
    }

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle
      continue
    }

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble
      continue
    }

    if (ch === ' ' && !inSingle && !inDouble) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }

    current += ch
  }

  if (current) tokens.push(current)
  return tokens
}

/**
 * Parses query params from a URL string into key-value pairs.
 */
export function parseQueryParams(urlStr: string): { key: string; value: string }[] {
  try {
    const url = new URL(urlStr.match(/^https?:\/\//) ? urlStr : `https://${urlStr}`)
    const params: { key: string; value: string }[] = []
    url.searchParams.forEach((value, key) => {
      params.push({ key, value })
    })
    return params
  } catch {
    return []
  }
}

/**
 * Rebuilds a URL with updated query params.
 * Keeps the base URL (scheme + host + path) intact.
 */
export function buildUrlWithParams(
  urlStr: string,
  params: { key: string; value: string }[]
): string {
  try {
    const url = new URL(urlStr.match(/^https?:\/\//) ? urlStr : `https://${urlStr}`)
    const newSearch = new URLSearchParams()
    for (const { key, value } of params) {
      if (key.trim()) newSearch.append(key.trim(), value)
    }
    url.search = newSearch.toString()
    return url.toString()
  } catch {
    return urlStr
  }
}
