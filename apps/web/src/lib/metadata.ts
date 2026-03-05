export interface UrlMetadata {
  title: string | null
  description: string | null
  favicon: string | null
}

export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DevVault/1.0)' },
      signal: AbortSignal.timeout(5000), // 5s timeout
    })

    const html = await response.text()

    // Extract title
    const titleMatch =
      html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ??
      html.match(/<meta\s+content="([^"]+)"\s+property="og:title"/i) ??
      html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch?.[1]?.trim() ?? null

    // Extract description
    const descMatch =
      html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i) ??
      html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) ??
      html.match(/<meta\s+content="([^"]+)"\s+name="description"/i)
    const description = descMatch?.[1]?.trim() ?? null

    // Extract favicon
    const faviconMatch =
      html.match(/<link[^>]+rel="shortcut icon"[^>]+href="([^"]+)"/i) ??
      html.match(/<link[^>]+href="([^"]+)"[^>]+rel="shortcut icon"/i) ??
      html.match(/<link[^>]+rel="icon"[^>]+href="([^"]+)"/i)

    let favicon = faviconMatch?.[1] ?? null

    // Resolve relative favicon URLs
    if (favicon && !favicon.startsWith('http')) {
      const base = new URL(url)
      favicon = favicon.startsWith('/')
        ? `${base.origin}${favicon}`
        : `${base.origin}/${favicon}`
    }

    // Fallback to Google's favicon service
    if (!favicon) {
      const domain = new URL(url).hostname
      favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    }

    return { title, description, favicon }
  } catch {
    // Fallback — still return favicon via Google even if fetch fails
    try {
      const domain = new URL(url).hostname
      return {
        title: null,
        description: null,
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      }
    } catch {
      return { title: null, description: null, favicon: null }
    }
  }
}