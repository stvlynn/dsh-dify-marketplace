/**
 * Same-origin client for the Host HTTP bridge.
 *
 * @module dsh-dify-marketplace/client/shared/api
 */
import { BRIDGE_ROUTES, type BridgeCollectionsResponse, type BridgeCredentialsResponse, type BridgeDetailResponse, type BridgeInstallResponse, type BridgeInstallTaskResponse, type BridgeInstalledResponse, type BridgeSearchRequest, type BridgeSearchResponse, type BridgeStatus, type BridgeUninstallResponse } from '../../shared/contracts/bridge.ts';
/** Fetch JSON from a bridge route. */
export declare function bridgeJson<T>(route: keyof typeof BRIDGE_ROUTES, init?: RequestInit & {
    query?: Record<string, string>;
}): Promise<T>;
export declare const api: {
    status: () => Promise<BridgeStatus>;
    search: (body: BridgeSearchRequest) => Promise<BridgeSearchResponse>;
    collections: () => Promise<BridgeCollectionsResponse>;
    detail: (pluginId: string) => Promise<BridgeDetailResponse>;
    iconUrl: (pluginId: string) => string;
    installed: () => Promise<BridgeInstalledResponse>;
    install: (uniqueIdentifier: string) => Promise<BridgeInstallResponse>;
    installTask: (taskId: string) => Promise<BridgeInstallTaskResponse>;
    uninstall: (pluginId: string) => Promise<BridgeUninstallResponse>;
    saveCredentials: (pluginId: string, credentials: Record<string, string>) => Promise<BridgeCredentialsResponse>;
};
//# sourceMappingURL=api.d.ts.map