/**
 * Real dify-plugin-daemon. Start it with `pnpm daemon:up` before this file.
 * A missing daemon fails the suite; nothing here is mocked.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DaemonClient } from '../../../src/host/infrastructure/daemon-client.ts'
import { DifyMarketplaceError } from '../../../src/host/domain/errors.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const PACKAGE = join(ROOT, 'fixtures/dify-plugins/hello.difypkg')
const BASE_URL = process.env.DAEMON_BASE_URL ?? 'http://127.0.0.1:5002'
const SERVER_KEY = process.env.DAEMON_SERVER_KEY ?? 'dsh-dify-marketplace-dev-key'
const TENANT_ID = process.env.DAEMON_TENANT_ID ?? '00000000-0000-0000-0000-000000000001'

const client = new DaemonClient({
  baseUrl: BASE_URL,
  serverKey: SERVER_KEY,
  tenantId: TENANT_ID,
  userId: 'dsh',
  timeoutMs: 120_000,
})

function packageFixture(): Uint8Array {
  if (!existsSync(PACKAGE)) {
    execFileSync('bash', [join(ROOT, 'scripts/package-fixture.sh')], { cwd: ROOT, stdio: 'inherit' })
  }
  if (!existsSync(PACKAGE)) {
    throw new Error(`fixture package was not written to ${PACKAGE}`)
  }
  return new Uint8Array(readFileSync(PACKAGE))
}

describe('dify-plugin-daemon', () => {
  let uniqueIdentifier = ''
  let installationId = ''

  beforeAll(async () => {
    try {
      await client.health()
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      throw new Error(
        `plugin daemon is not reachable at ${BASE_URL}. Run \`pnpm daemon:up\` first. Last error: ${detail}`,
      )
    }
  })

  afterAll(async () => {
    if (installationId !== '') {
      await client.uninstall(installationId)
    }
  })

  it('uploads, installs, lists, and uninstalls the hello fixture', async () => {
    const decoded = await client.uploadPackage(packageFixture(), 'hello.difypkg', false)
    uniqueIdentifier = decoded.unique_identifier
    expect(uniqueIdentifier).toMatch(/^dsh\/hello:/)

    const started = await client.installFromIdentifiers([uniqueIdentifier], 'package')
    if (started.task_id !== '') {
      const task = await client.awaitInstallTask(started.task_id, { deadlineMs: 180_000 })
      expect(task.status).toBe('success')
    }

    const listed = await client.listAllPlugins()
    const installed = listed.find(plugin => plugin.plugin_unique_identifier === uniqueIdentifier)
    expect(installed).toBeDefined()
    installationId = installed?.installation_id ?? ''
    expect(installationId).not.toBe('')

    await client.uninstall(installationId)
    installationId = ''
    const remaining = await client.listAllPlugins()
    expect(remaining.some(plugin => plugin.plugin_unique_identifier === uniqueIdentifier)).toBe(false)
  }, 240_000)

  it('rejects an empty server key', async () => {
    const unauthorized = new DaemonClient({
      baseUrl: BASE_URL,
      serverKey: 'not-the-server-key',
      tenantId: TENANT_ID,
      userId: 'dsh',
      timeoutMs: 10_000,
    })
    await expect(unauthorized.listPlugins(1, 1)).rejects.toBeInstanceOf(DifyMarketplaceError)
  })
})
