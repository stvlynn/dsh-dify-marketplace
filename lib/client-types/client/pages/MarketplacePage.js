import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Settings section: Dify Marketplace browser, installer, and credential form.
 *
 * @module dsh-dify-marketplace/client/pages/marketplace
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Pill, StateDot } from '@deepseek-ai/dsh-client-ui-primitives';
import { localized } from "../../shared/localized.js";
import { api, MARKETPLACE_TABS } from "../shared/index.js";
import styles from '../shared/styles.module.css';
/** Marketplace settings page. */
export function MarketplacePage({ t }) {
    const [status, setStatus] = useState();
    const [tab, setTab] = useState('all');
    const [query, setQuery] = useState('');
    const [search, setSearch] = useState();
    const [collections, setCollections] = useState();
    const [installed, setInstalled] = useState([]);
    const [selected, setSelected] = useState();
    const [detail, setDetail] = useState();
    const [error, setError] = useState();
    const [busy, setBusy] = useState();
    const [credentialDraft, setCredentialDraft] = useState({});
    const loadStatus = useCallback(async () => {
        try {
            setStatus(await api.status());
        }
        catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        }
    }, []);
    const loadList = useCallback(async () => {
        setError(undefined);
        try {
            if (tab === 'installed') {
                setInstalled((await api.installed()).plugins);
                return;
            }
            if (tab === 'all') {
                setCollections(await api.collections());
            }
            const category = MARKETPLACE_TABS.find(item => item.id === tab)?.category ?? '';
            setSearch(await api.search({
                query,
                page: 1,
                pageSize: 20,
                category,
                kind: tab === 'bundles' ? 'bundles' : 'plugins',
            }));
        }
        catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        }
    }, [query, tab]);
    useEffect(() => { void loadStatus(); }, [loadStatus]);
    useEffect(() => { void loadList(); }, [loadList]);
    useEffect(() => {
        if (selected === undefined) {
            setDetail(undefined);
            return;
        }
        void api.detail(selected).then((next) => {
            setDetail(next);
            setCredentialDraft({});
        }).catch((caught) => {
            setError(caught instanceof Error ? caught.message : String(caught));
        });
    }, [selected]);
    const items = useMemo(() => search?.plugins ?? [], [search]);
    async function onInstall(uniqueIdentifier) {
        setBusy('install');
        setError(undefined);
        try {
            const started = await api.install(uniqueIdentifier);
            if (started.taskId !== null) {
                for (;;) {
                    const task = await api.installTask(started.taskId);
                    if (task.status === 'success' || task.status === 'failed') {
                        if (task.status === 'failed') {
                            setError(task.registration.error?.detail ?? t('failed'));
                        }
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            await loadList();
            // Refresh in place: setSelected with the same id is a no-op, so the
            // detail effect would never re-fetch and the view would keep showing
            // the Install button after a successful install.
            setDetail(await api.detail(started.pluginId));
        }
        catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        }
        finally {
            setBusy(undefined);
        }
    }
    async function onUninstall(pluginId) {
        setBusy('uninstall');
        setError(undefined);
        try {
            await api.uninstall(pluginId);
            setSelected(undefined);
            await loadList();
        }
        catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        }
        finally {
            setBusy(undefined);
        }
    }
    async function onCredentials(event) {
        event.preventDefault();
        if (detail === undefined)
            return;
        setBusy('credentials');
        setError(undefined);
        try {
            const result = await api.saveCredentials(detail.plugin.plugin_id, credentialDraft);
            if (result.error !== undefined)
                setError(result.error.detail);
            setDetail(await api.detail(detail.plugin.plugin_id));
            await loadList();
        }
        catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        }
        finally {
            setBusy(undefined);
        }
    }
    return (_jsxs("div", { className: styles.root, children: [status !== undefined && (!status.marketplace.reachable || !status.daemon.configured || !status.daemon.reachable) && (_jsxs("div", { className: styles.banner, children: [!status.marketplace.reachable && (_jsxs("span", { className: styles.status, children: [_jsx(StateDot, { state: "error" }), t('marketplaceDown')] })), (!status.daemon.configured || !status.daemon.reachable) && (_jsxs("span", { className: styles.status, children: [_jsx(StateDot, { state: status.daemon.configured ? 'error' : 'warning' }), status.daemon.configured ? t('daemonDown') : t('daemonMissing')] }))] })), _jsxs("div", { className: styles.toolbar, children: [_jsx("div", { className: styles.search, children: _jsx(Input, { value: query, placeholder: t('searchPlaceholder'), onChange: event => setQuery(event.target.value), onKeyDown: (event) => { if (event.key === 'Enter')
                                void loadList(); } }) }), _jsx(Button, { onClick: () => { void loadList(); }, children: t('search') })] }), _jsx("div", { className: styles.tabs, children: MARKETPLACE_TABS.map(item => (_jsx("button", { type: "button", className: `${styles.tab} ${tab === item.id ? styles.tabActive : ''}`, onClick: () => { setTab(item.id); setSelected(undefined); }, children: t(item.key) }, item.id))) }), error !== undefined && _jsx("div", { className: styles.error, children: error }), tab === 'installed' ? (_jsx(InstalledList, { plugins: installed, t: t, onSelect: setSelected })) : tab === 'all' && collections !== undefined ? (_jsxs("div", { children: [collections.collections.map(entry => (_jsxs("section", { className: styles.collection, children: [_jsx("div", { className: styles.collectionTitle, children: localized(entry.collection.label) }), _jsx(PluginGrid, { items: entry.plugins, t: t, onSelect: setSelected })] }, entry.collection.name))), _jsx(PluginGrid, { items: items, t: t, onSelect: setSelected })] })) : (_jsx(PluginGrid, { items: items, t: t, onSelect: setSelected, empty: tab === 'bundles' ? t('emptyBundles') : t('noResults') })), detail !== undefined && (_jsx(Detail, { detail: detail, t: t, busy: busy, credentialDraft: credentialDraft, onCredentialChange: (name, value) => setCredentialDraft(current => ({ ...current, [name]: value })), onInstall: () => { void onInstall(detail.plugin.latest_package_identifier); }, onUninstall: () => { void onUninstall(detail.plugin.plugin_id); }, onCredentials: onCredentials, onClose: () => setSelected(undefined) }))] }));
}
function PluginGrid(props) {
    if (props.items.length === 0)
        return _jsx("div", { className: styles.empty, children: props.empty });
    return (_jsx("div", { className: styles.grid, children: props.items.map(item => (_jsxs("button", { type: "button", className: styles.card, onClick: () => props.onSelect(item.plugin.plugin_id), children: [_jsxs("div", { className: styles.cardHeader, children: [_jsx("img", { className: styles.icon, src: api.iconUrl(item.plugin.plugin_id), alt: "" }), _jsx("div", { className: styles.title, children: localized(item.plugin.label) })] }), _jsx("div", { className: styles.brief, children: localized(item.plugin.brief) }), _jsxs("div", { className: styles.meta, children: [item.plugin.plugin_id, " \u00B7 ", item.plugin.latest_version, item.installedVersion !== null && _jsxs(_Fragment, { children: [" \u00B7 ", props.t('installed'), " ", item.installedVersion] })] })] }, item.plugin.plugin_id))) }));
}
function InstalledList(props) {
    if (props.plugins.length === 0)
        return _jsx("div", { className: styles.empty, children: props.t('noResults') });
    return (_jsx("div", { className: styles.grid, children: props.plugins.map(plugin => (_jsxs("button", { type: "button", className: styles.card, onClick: () => props.onSelect(plugin.pluginId), children: [_jsxs("div", { className: styles.cardHeader, children: [_jsx("div", { className: styles.title, children: localized(plugin.label) }), _jsx(Pill, { children: plugin.registration.status })] }), _jsxs("div", { className: styles.meta, children: [plugin.pluginId, " \u00B7 ", plugin.version] })] }, plugin.pluginId))) }));
}
function Detail(props) {
    const { detail, t } = props;
    const installed = detail.installedVersion !== null;
    return (_jsxs("div", { className: styles.detail, children: [_jsxs("div", { className: styles.cardHeader, children: [_jsx("img", { className: styles.icon, src: api.iconUrl(detail.plugin.plugin_id), alt: "" }), _jsx("div", { className: styles.title, children: localized(detail.plugin.label) }), _jsx(Button, { className: styles.closeButton, onClick: props.onClose, children: t('close') })] }), _jsx("div", { className: styles.brief, children: localized(detail.plugin.brief) }), _jsxs("div", { className: styles.meta, children: [detail.plugin.plugin_id, " \u00B7 ", detail.plugin.latest_version, " \u00B7 ", detail.registration.surface] }), _jsxs("div", { className: styles.actions, children: [!installed && (_jsx(Button, { disabled: props.busy !== undefined, onClick: props.onInstall, children: props.busy === 'install' ? t('installing') : t('install') })), installed && (_jsx(Button, { disabled: props.busy !== undefined, onClick: props.onUninstall, children: props.busy === 'uninstall' ? t('uninstalling') : t('uninstall') }))] }), detail.credentialFields.length > 0 && (_jsxs("form", { className: styles.form, onSubmit: props.onCredentials, children: [detail.credentialFields.map(field => (_jsxs("div", { className: styles.field, children: [_jsx("label", { htmlFor: `cred-${field.name}`, children: localized(field.label) || field.name }), _jsx(Input, { id: `cred-${field.name}`, type: field.type === 'secret-input' ? 'password' : 'text', value: props.credentialDraft[field.name] ?? '', placeholder: localized(field.placeholder ?? undefined), onChange: event => props.onCredentialChange(field.name, event.target.value) })] }, field.name))), _jsx(Button, { type: "submit", className: styles.submitButton, disabled: props.busy !== undefined, children: t('credentials') })] }))] }));
}
//# sourceMappingURL=MarketplacePage.js.map