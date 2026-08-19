/**
 * Settings section: Dify Marketplace browser, installer, and credential form.
 *
 * @module dsh-dify-marketplace/client/pages/marketplace
 */

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Button, Input, Pill, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  BridgeCollectionsResponse,
  BridgeDetailResponse,
  BridgeInstalledPlugin,
  BridgePluginListItem,
  BridgeSearchResponse,
  BridgeStatus,
} from '../../shared/contracts/bridge.ts'
import { localized } from '../../shared/localized.ts'
import { api, MARKETPLACE_TABS, type MarketplaceTabId, type MessageKey } from '../shared/index.ts'
import styles from '../shared/styles.module.css'

interface MarketplacePageProps {
  t: (key: MessageKey, params?: Record<string, unknown>) => string
}

/** Marketplace settings page. */
export function MarketplacePage({ t }: MarketplacePageProps) {
  const [status, setStatus] = useState<BridgeStatus | undefined>()
  const [tab, setTab] = useState<MarketplaceTabId>('all')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState<BridgeSearchResponse | undefined>()
  const [collections, setCollections] = useState<BridgeCollectionsResponse | undefined>()
  const [installed, setInstalled] = useState<BridgeInstalledPlugin[]>([])
  const [selected, setSelected] = useState<string | undefined>()
  const [detail, setDetail] = useState<BridgeDetailResponse | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState<string | undefined>()
  const [credentialDraft, setCredentialDraft] = useState<Record<string, string>>({})

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await api.status())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }, [])

  const loadList = useCallback(async () => {
    setError(undefined)
    try {
      if (tab === 'installed') {
        setInstalled((await api.installed()).plugins)
        return
      }
      if (tab === 'all') {
        setCollections(await api.collections())
      }
      const category = MARKETPLACE_TABS.find(item => item.id === tab)?.category ?? ''
      setSearch(await api.search({
        query,
        page: 1,
        pageSize: 20,
        category,
        kind: tab === 'bundles' ? 'bundles' : 'plugins',
      }))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }, [query, tab])

  useEffect(() => { void loadStatus() }, [loadStatus])
  useEffect(() => { void loadList() }, [loadList])

  useEffect(() => {
    if (selected === undefined) {
      setDetail(undefined)
      return
    }
    void api.detail(selected).then((next) => {
      setDetail(next)
      setCredentialDraft({})
    }).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : String(caught))
    })
  }, [selected])

  const items: BridgePluginListItem[] = useMemo(() => search?.plugins ?? [], [search])

  async function onInstall(uniqueIdentifier: string): Promise<void> {
    setBusy('install')
    setError(undefined)
    try {
      const started = await api.install(uniqueIdentifier)
      if (started.taskId !== null) {
        for (;;) {
          const task = await api.installTask(started.taskId)
          if (task.status === 'success' || task.status === 'failed') {
            if (task.status === 'failed') {
              setError(task.registration.error?.detail ?? t('failed'))
            }
            break
          }
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      await loadList()
      // Refresh in place: setSelected with the same id is a no-op, so the
      // detail effect would never re-fetch and the view would keep showing
      // the Install button after a successful install.
      setDetail(await api.detail(started.pluginId))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(undefined)
    }
  }

  async function onUninstall(pluginId: string): Promise<void> {
    setBusy('uninstall')
    setError(undefined)
    try {
      await api.uninstall(pluginId)
      setSelected(undefined)
      await loadList()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(undefined)
    }
  }

  async function onCredentials(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (detail === undefined) return
    setBusy('credentials')
    setError(undefined)
    try {
      const result = await api.saveCredentials(detail.plugin.plugin_id, credentialDraft)
      if (result.error !== undefined) setError(result.error.detail)
      setDetail(await api.detail(detail.plugin.plugin_id))
      await loadList()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <div className={styles.root}>
      {status !== undefined && (!status.marketplace.reachable || !status.daemon.configured || !status.daemon.reachable) && (
        <div className={styles.banner}>
          {!status.marketplace.reachable && (
            <span className={styles.status}>
              <StateDot state="error" />
              {t('marketplaceDown')}
            </span>
          )}
          {(!status.daemon.configured || !status.daemon.reachable) && (
            <span className={styles.status}>
              <StateDot state={status.daemon.configured ? 'error' : 'warning'} />
              {status.daemon.configured ? t('daemonDown') : t('daemonMissing')}
            </span>
          )}
        </div>
      )}
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Input
            value={query}
            placeholder={t('searchPlaceholder')}
            onChange={event => setQuery((event.target as HTMLInputElement).value)}
            onKeyDown={(event) => { if (event.key === 'Enter') void loadList() }}
          />
        </div>
        <Button onClick={() => { void loadList() }}>{t('search')}</Button>
      </div>
      <div className={styles.tabs}>
        {MARKETPLACE_TABS.map(item => (
          <button
            key={item.id}
            type="button"
            className={`${styles.tab} ${tab === item.id ? styles.tabActive : ''}`}
            onClick={() => { setTab(item.id); setSelected(undefined) }}
          >
            {t(item.key)}
          </button>
        ))}
      </div>
      {error !== undefined && <div className={styles.error}>{error}</div>}
      {tab === 'installed' ? (
        <InstalledList plugins={installed} t={t} onSelect={setSelected} />
      ) : tab === 'all' && collections !== undefined ? (
        <div>
          {collections.collections.map(entry => (
            <section key={entry.collection.name} className={styles.collection}>
              <div className={styles.collectionTitle}>{localized(entry.collection.label)}</div>
              <PluginGrid items={entry.plugins} t={t} onSelect={setSelected} />
            </section>
          ))}
          <PluginGrid items={items} t={t} onSelect={setSelected} />
        </div>
      ) : (
        <PluginGrid items={items} t={t} onSelect={setSelected} empty={tab === 'bundles' ? t('emptyBundles') : t('noResults')} />
      )}
      {detail !== undefined && (
        <Detail
          detail={detail}
          t={t}
          busy={busy}
          credentialDraft={credentialDraft}
          onCredentialChange={(name, value) => setCredentialDraft(current => ({ ...current, [name]: value }))}
          onInstall={() => { void onInstall(detail.plugin.latest_package_identifier) }}
          onUninstall={() => { void onUninstall(detail.plugin.plugin_id) }}
          onCredentials={onCredentials}
          onClose={() => setSelected(undefined)}
        />
      )}
    </div>
  )
}

function PluginGrid(props: {
  items: BridgePluginListItem[]
  t: MarketplacePageProps['t']
  onSelect: (pluginId: string) => void
  empty?: string
}) {
  if (props.items.length === 0) return <div className={styles.empty}>{props.empty}</div>
  return (
    <div className={styles.grid}>
      {props.items.map(item => (
        <button key={item.plugin.plugin_id} type="button" className={styles.card} onClick={() => props.onSelect(item.plugin.plugin_id)}>
          <div className={styles.cardHeader}>
            <img className={styles.icon} src={api.iconUrl(item.plugin.plugin_id)} alt="" />
            <div className={styles.title}>{localized(item.plugin.label)}</div>
          </div>
          <div className={styles.brief}>{localized(item.plugin.brief)}</div>
          <div className={styles.meta}>
            {item.plugin.plugin_id} · {item.plugin.latest_version}
            {item.installedVersion !== null && <> · {props.t('installed')} {item.installedVersion}</>}
          </div>
        </button>
      ))}
    </div>
  )
}

function InstalledList(props: {
  plugins: BridgeInstalledPlugin[]
  t: MarketplacePageProps['t']
  onSelect: (pluginId: string) => void
}) {
  if (props.plugins.length === 0) return <div className={styles.empty}>{props.t('noResults')}</div>
  return (
    <div className={styles.grid}>
      {props.plugins.map(plugin => (
        <button key={plugin.pluginId} type="button" className={styles.card} onClick={() => props.onSelect(plugin.pluginId)}>
          <div className={styles.cardHeader}>
            <div className={styles.title}>{localized(plugin.label)}</div>
            <Pill>{plugin.registration.status}</Pill>
          </div>
          <div className={styles.meta}>{plugin.pluginId} · {plugin.version}</div>
        </button>
      ))}
    </div>
  )
}

function Detail(props: {
  detail: BridgeDetailResponse
  t: MarketplacePageProps['t']
  busy: string | undefined
  credentialDraft: Record<string, string>
  onCredentialChange: (name: string, value: string) => void
  onInstall: () => void
  onUninstall: () => void
  onCredentials: (event: FormEvent) => void
  onClose: () => void
}) {
  const { detail, t } = props
  const installed = detail.installedVersion !== null
  return (
    <div className={styles.detail}>
      <div className={styles.cardHeader}>
        <img className={styles.icon} src={api.iconUrl(detail.plugin.plugin_id)} alt="" />
        <div className={styles.title}>{localized(detail.plugin.label)}</div>
        <Button className={styles.closeButton} onClick={props.onClose}>{t('close')}</Button>
      </div>
      <div className={styles.brief}>{localized(detail.plugin.brief)}</div>
      <div className={styles.meta}>
        {detail.plugin.plugin_id} · {detail.plugin.latest_version} · {detail.registration.surface}
      </div>
      <div className={styles.actions}>
        {!installed && (
          <Button disabled={props.busy !== undefined} onClick={props.onInstall}>
            {props.busy === 'install' ? t('installing') : t('install')}
          </Button>
        )}
        {installed && (
          <Button disabled={props.busy !== undefined} onClick={props.onUninstall}>
            {props.busy === 'uninstall' ? t('uninstalling') : t('uninstall')}
          </Button>
        )}
      </div>
      {detail.credentialFields.length > 0 && (
        <form className={styles.form} onSubmit={props.onCredentials}>
          {detail.credentialFields.map(field => (
            <div key={field.name} className={styles.field}>
              <label htmlFor={`cred-${field.name}`}>{localized(field.label) || field.name}</label>
              <Input
                id={`cred-${field.name}`}
                type={field.type === 'secret-input' ? 'password' : 'text'}
                value={props.credentialDraft[field.name] ?? ''}
                placeholder={localized(field.placeholder ?? undefined)}
                onChange={event => props.onCredentialChange(field.name, (event.target as HTMLInputElement).value)}
              />
            </div>
          ))}
          <Button type="submit" className={styles.submitButton} disabled={props.busy !== undefined}>{t('credentials')}</Button>
        </form>
      )}
    </div>
  )
}
