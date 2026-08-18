/**
 * Record the live Dify Marketplace HTTP contract into fixtures/marketplace/.
 *
 * The marketplace sits behind Cloudflare: anonymous clients that send no
 * browser-shaped headers are answered with 403, so every request here carries
 * the same header set the Host client uses at runtime.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'fixtures', 'marketplace')
const BASE_URL = process.env.DIFY_MARKETPLACE_URL ?? 'https://marketplace.dify.ai'
const DIFY_VERSION = process.env.DIFY_VERSION ?? '1.10.0'
const USER_AGENT
  = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

/** Sample plugin used for every per-plugin endpoint capture. */
const SAMPLE = { org: 'langgenius', name: 'google' }

/** One capture step: a label, the request, and how much of the body to keep. */
const CAPTURES = [
  {
    file: 'plugins-search-advanced.json',
    method: 'POST',
    path: '/api/v1/plugins/search/advanced',
    body: { page: 1, page_size: 3, query: 'google', sort_by: 'install_count', sort_order: 'DESC' },
  },
  // One capture per marketplace tab, so the category filter values the Web UI
  // sends are recorded against real responses rather than assumed. Probing
  // established that the Extensions tab filters on `extension`; `endpoint`
  // returns an empty page, and `agent-strategy` must be hyphenated.
  ...['tool', 'model', 'datasource', 'trigger', 'agent-strategy', 'extension'].map(category => ({
    file: `plugins-search-category-${category}.json`,
    method: 'POST',
    path: '/api/v1/plugins/search/advanced',
    body: { page: 1, page_size: 3, query: '', category, tags: [] },
  })),
  {
    file: 'plugins-search-tags.json',
    method: 'POST',
    path: '/api/v1/plugins/search/advanced',
    body: { page: 1, page_size: 3, query: 'search', tags: ['search'] },
  },
  // Error shape: the marketplace answers HTTP 200 with a non-zero envelope
  // code, so the client must inspect `code` and never trust the status alone.
  {
    file: 'plugin-detail-unknown.json',
    method: 'GET',
    path: '/api/v1/plugins/langgenius/this-plugin-does-not-exist',
  },
  {
    file: 'bundles-search-advanced.json',
    method: 'POST',
    path: '/api/v1/bundles/search/advanced',
    body: { page: 1, page_size: 3, query: '' },
  },
  {
    file: 'collections.json',
    method: 'GET',
    path: '/api/v1/collections?page=1&page_size=100',
  },
  {
    file: 'plugin-detail.json',
    method: 'GET',
    path: `/api/v1/plugins/${SAMPLE.org}/${SAMPLE.name}`,
  },
  {
    file: 'plugin-versions.json',
    method: 'GET',
    path: `/api/v1/plugins/${SAMPLE.org}/${SAMPLE.name}/versions?page=1&page_size=5`,
  },
  {
    file: 'plugins-batch.json',
    method: 'POST',
    path: '/api/v1/plugins/batch',
    body: { plugin_ids: [`${SAMPLE.org}/${SAMPLE.name}`] },
  },
  // Install-count reporting. Captured with a deliberately invalid identifier so
  // no real counter is incremented by a capture run; this also records the
  // rejection shape.
  {
    file: 'stats-install-count-invalid.json',
    method: 'POST',
    path: '/api/v1/stats/plugins/install_count',
    body: { unique_identifier: 'dsh-dify-marketplace-probe/invalid:0.0.0@deadbeef' },
  },
]

/**
 * Perform one capture and return its recorded envelope.
 * @param {{file: string, method: string, path: string, body?: unknown}} capture - request description.
 * @returns {Promise<Record<string, unknown>>} the recorded envelope.
 */
async function record(capture) {
  const url = `${BASE_URL}${capture.path}`
  const headers = {
    'Accept': 'application/json',
    'User-Agent': USER_AGENT,
    'X-Dify-Version': DIFY_VERSION,
  }
  if (capture.body !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(url, {
    method: capture.method,
    headers,
    body: capture.body === undefined ? undefined : JSON.stringify(capture.body),
    redirect: 'follow',
  })
  const text = await response.text()
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = { nonJsonBody: text.slice(0, 400) }
  }
  return {
    request: {
      method: capture.method,
      path: capture.path,
      headers: { 'X-Dify-Version': DIFY_VERSION, 'User-Agent': '<browser user agent>' },
      body: capture.body ?? null,
    },
    response: {
      status: response.status,
      contentType: response.headers.get('content-type'),
      body: parsed,
    },
  }
}

/** Capture the icon endpoint, recording only its metadata (binary body is not stored). */
async function recordIcon() {
  const path = `/api/v1/plugins/${SAMPLE.org}/${SAMPLE.name}/icon`
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'User-Agent': USER_AGENT, 'X-Dify-Version': DIFY_VERSION },
  })
  const bytes = new Uint8Array(await response.arrayBuffer())
  return {
    request: { method: 'GET', path },
    response: {
      status: response.status,
      contentType: response.headers.get('content-type'),
      byteLength: bytes.byteLength,
      bodyNote: 'binary image body is intentionally not stored',
    },
  }
}

/** Capture the download-url endpoint for the newest published version. */
async function recordDownloadUrl(uniqueIdentifier) {
  const path = `/api/v1/plugins/download-url?unique_identifier=${encodeURIComponent(uniqueIdentifier)}`
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': USER_AGENT, 'X-Dify-Version': DIFY_VERSION },
    redirect: 'manual',
  })
  const text = await response.text()
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = { nonJsonBody: text.slice(0, 400) }
  }
  return {
    request: { method: 'GET', path },
    response: {
      status: response.status,
      contentType: response.headers.get('content-type'),
      location: response.headers.get('location'),
      body: parsed,
    },
  }
}

/** Capture the global manifest snapshot, storing only its head to keep the fixture small. */
async function recordManifest() {
  const path = '/api/v1/dist/plugins/manifest.json'
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': USER_AGENT, 'X-Dify-Version': DIFY_VERSION },
  })
  const text = await response.text()
  let head
  let total = null
  try {
    const parsed = JSON.parse(text)
    total = Array.isArray(parsed.plugins) ? parsed.plugins.length : null
    head = { ...parsed, plugins: Array.isArray(parsed.plugins) ? parsed.plugins.slice(0, 3) : parsed.plugins }
  } catch {
    head = { nonJsonBody: text.slice(0, 400) }
  }
  return {
    request: { method: 'GET', path },
    response: {
      status: response.status,
      contentType: response.headers.get('content-type'),
      pluginCount: total,
      bodyNote: 'plugins array truncated to the first 3 entries',
      body: head,
    },
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const summary = []

  for (const capture of CAPTURES) {
    const envelope = await record(capture)
    await writeFile(join(OUT_DIR, capture.file), `${JSON.stringify(envelope, null, 2)}\n`)
    summary.push({ file: capture.file, status: envelope.response.status, path: capture.path })
    process.stdout.write(`${capture.method} ${capture.path} -> ${envelope.response.status}\n`)
  }

  // Collections plugins need a real collection name from the capture above.
  const collections = JSON.parse(
    await (await import('node:fs/promises')).readFile(join(OUT_DIR, 'collections.json'), 'utf8'),
  )
  const firstCollection = collections.response.body?.data?.collections?.[0]?.name
  if (typeof firstCollection === 'string') {
    const envelope = await record({
      file: 'collection-plugins.json',
      method: 'POST',
      path: `/api/v1/collections/${encodeURIComponent(firstCollection)}/plugins`,
      body: {},
    })
    await writeFile(join(OUT_DIR, 'collection-plugins.json'), `${JSON.stringify(envelope, null, 2)}\n`)
    summary.push({ file: 'collection-plugins.json', status: envelope.response.status, path: `/api/v1/collections/${firstCollection}/plugins` })
    process.stdout.write(`POST /api/v1/collections/${firstCollection}/plugins -> ${envelope.response.status}\n`)
  }

  const icon = await recordIcon()
  await writeFile(join(OUT_DIR, 'plugin-icon.json'), `${JSON.stringify(icon, null, 2)}\n`)
  summary.push({ file: 'plugin-icon.json', status: icon.response.status, path: icon.request.path })
  process.stdout.write(`GET ${icon.request.path} -> ${icon.response.status}\n`)

  const versions = JSON.parse(
    await (await import('node:fs/promises')).readFile(join(OUT_DIR, 'plugin-versions.json'), 'utf8'),
  )
  const uniqueIdentifier = versions.response.body?.data?.versions?.[0]?.unique_identifier
  if (typeof uniqueIdentifier === 'string') {
    const download = await recordDownloadUrl(uniqueIdentifier)
    await writeFile(join(OUT_DIR, 'plugin-download-url.json'), `${JSON.stringify(download, null, 2)}\n`)
    summary.push({ file: 'plugin-download-url.json', status: download.response.status, path: download.request.path })
    process.stdout.write(`GET /api/v1/plugins/download-url -> ${download.response.status}\n`)
  }

  const manifest = await recordManifest()
  await writeFile(join(OUT_DIR, 'dist-plugins-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  summary.push({ file: 'dist-plugins-manifest.json', status: manifest.response.status, path: manifest.request.path })
  process.stdout.write(`GET ${manifest.request.path} -> ${manifest.response.status}\n`)

  await writeFile(
    join(OUT_DIR, 'index.json'),
    `${JSON.stringify({ baseUrl: BASE_URL, difyVersionHeader: DIFY_VERSION, captures: summary }, null, 2)}\n`,
  )
}

await main()
