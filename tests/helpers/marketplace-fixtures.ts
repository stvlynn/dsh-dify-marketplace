import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures/marketplace')

/** One captured marketplace HTTP exchange. */
export interface MarketplaceCapture {
  request: {
    method: string
    path: string
    headers?: Record<string, string>
    body?: unknown
  }
  response: {
    status: number
    contentType?: string
    location?: string
    body: unknown
  }
}

/** Load one capture from `fixtures/marketplace/`. */
export function loadCapture(fileName: string): MarketplaceCapture {
  const text = readFileSync(join(FIXTURES, fileName), 'utf8')
  return JSON.parse(text) as MarketplaceCapture
}

/** JSON envelope used by marketplace captures. */
export interface CapturedEnvelope {
  code: number
  data: unknown
  msg: string
}
